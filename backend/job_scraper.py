import aiohttp
import asyncio
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import logging
import re
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

class JobScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    
    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        experience_level: Optional[str] = None,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Search for jobs across multiple sources
        """
        results = []
        
        # Create tasks for parallel scraping
        tasks = [
            self.scrape_remoteok(query, max_results // 3),
            self.scrape_weworkremotely(query, max_results // 3),
            self.scrape_indeed(query, location, max_results // 3),
        ]
        
        # Execute all scrapers in parallel
        scraper_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        for result in scraper_results:
            if isinstance(result, list):
                results.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Scraper error: {str(result)}")
        
        # Apply filters
        if remote_only:
            results = [job for job in results if job.get('is_remote', False)]
        
        if experience_level:
            results = [job for job in results if self._matches_experience(job, experience_level)]
        
        # Deduplicate by title + company
        seen = set()
        unique_results = []
        for job in results:
            key = (job.get('title', '').lower(), job.get('company', '').lower())
            if key not in seen and key[0] and key[1]:
                seen.add(key)
                unique_results.append(job)
        
        return unique_results[:max_results]
    
    async def scrape_remoteok(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Scrape jobs from RemoteOK
        """
        results = []
        try:
            url = f"https://remoteok.com/api"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Filter jobs matching query
                        query_lower = query.lower()
                        for job in data[1:]:  # First item is metadata
                            if not isinstance(job, dict):
                                continue
                            
                            title = job.get('position', '')
                            description = job.get('description', '')
                            tags = ' '.join(job.get('tags', []))
                            
                            # Check if query matches title, description, or tags
                            if (query_lower in title.lower() or 
                                query_lower in description.lower() or 
                                query_lower in tags.lower()):
                                
                                results.append({
                                    'title': title,
                                    'company': job.get('company', 'Unknown'),
                                    'location': 'Remote',
                                    'description': description[:500] + '...' if len(description) > 500 else description,
                                    'posted_date': self._parse_date(job.get('date')),
                                    'job_url': job.get('url', ''),
                                    'company_url': job.get('company_logo', ''),
                                    'salary_range': job.get('salary_max', ''),
                                    'is_remote': True,
                                    'source': 'RemoteOK',
                                    'tags': job.get('tags', [])[:5]
                                })
                                
                                if len(results) >= limit:
                                    break
        except Exception as e:
            logger.error(f"RemoteOK scraping error: {str(e)}")
        
        return results
    
    async def scrape_weworkremotely(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Scrape jobs from We Work Remotely
        """
        results = []
        try:
            url = "https://weworkremotely.com/remote-jobs/search"
            params = {'term': query}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, headers=self.headers, timeout=10) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        job_listings = soup.find_all('li', class_='feature')[:limit]
                        
                        for job in job_listings:
                            try:
                                title_elem = job.find('span', class_='title')
                                company_elem = job.find('span', class_='company')
                                link_elem = job.find('a', class_='preventLink')
                                
                                if title_elem and company_elem:
                                    job_url = f"https://weworkremotely.com{link_elem['href']}" if link_elem else ""
                                    
                                    results.append({
                                        'title': title_elem.text.strip(),
                                        'company': company_elem.text.strip(),
                                        'location': 'Remote',
                                        'description': 'View full description at source',
                                        'posted_date': datetime.now(timezone.utc).isoformat(),
                                        'job_url': job_url,
                                        'company_url': '',
                                        'salary_range': '',
                                        'is_remote': True,
                                        'source': 'We Work Remotely',
                                        'tags': []
                                    })
                            except Exception as e:
                                logger.debug(f"Error parsing WWR job: {str(e)}")
                                continue
        except Exception as e:
            logger.error(f"WeWorkRemotely scraping error: {str(e)}")
        
        return results
    
    async def scrape_indeed(self, query: str, location: Optional[str], limit: int = 10) -> List[Dict]:
        """
        Scrape jobs from Indeed (simplified)
        """
        results = []
        try:
            # Build search URL
            query_encoded = quote_plus(query)
            location_encoded = quote_plus(location) if location else quote_plus("United States")
            url = f"https://www.indeed.com/jobs?q={query_encoded}&l={location_encoded}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers, timeout=10) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Find job cards (Indeed structure may vary)
                        job_cards = soup.find_all('div', class_='job_seen_beacon')[:limit]
                        
                        if not job_cards:
                            job_cards = soup.find_all('td', class_='resultContent')[:limit]
                        
                        for card in job_cards:
                            try:
                                title_elem = card.find('h2', class_='jobTitle')
                                if not title_elem:
                                    title_elem = card.find('a')
                                
                                company_elem = card.find('span', class_='companyName')
                                location_elem = card.find('div', class_='companyLocation')
                                
                                if title_elem:
                                    title = title_elem.get_text(strip=True)
                                    company = company_elem.get_text(strip=True) if company_elem else 'Unknown'
                                    loc = location_elem.get_text(strip=True) if location_elem else location or 'Unknown'
                                    
                                    # Try to get job link
                                    link = title_elem.find('a')
                                    job_url = f"https://www.indeed.com{link['href']}" if link and link.get('href') else ""
                                    
                                    results.append({
                                        'title': title,
                                        'company': company,
                                        'location': loc,
                                        'description': 'View full description at source',
                                        'posted_date': datetime.now(timezone.utc).isoformat(),
                                        'job_url': job_url,
                                        'company_url': '',
                                        'salary_range': '',
                                        'is_remote': 'remote' in loc.lower(),
                                        'source': 'Indeed',
                                        'tags': []
                                    })
                            except Exception as e:
                                logger.debug(f"Error parsing Indeed job: {str(e)}")
                                continue
        except Exception as e:
            logger.error(f"Indeed scraping error: {str(e)}")
        
        return results
    
    def _parse_date(self, date_str) -> str:
        """
        Parse various date formats to ISO format
        """
        if not date_str:
            return datetime.now(timezone.utc).isoformat()
        
        try:
            if isinstance(date_str, str):
                # Try parsing various formats
                for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d %b %Y']:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        return dt.replace(tzinfo=timezone.utc).isoformat()
                    except ValueError:
                        continue
                
                # Handle relative dates
                if 'today' in date_str.lower():
                    return datetime.now(timezone.utc).isoformat()
                elif 'yesterday' in date_str.lower():
                    return (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
                
        except Exception:
            pass
        
        return datetime.now(timezone.utc).isoformat()
    
    def _matches_experience(self, job: Dict, level: str) -> bool:
        """
        Check if job matches experience level
        """
        title_lower = job.get('title', '').lower()
        desc_lower = job.get('description', '').lower()
        combined = f"{title_lower} {desc_lower}"
        
        level_keywords = {
            'entry': ['entry', 'junior', 'graduate', 'intern', '0-2 years'],
            'mid': ['mid', 'intermediate', '2-5 years', '3-5 years'],
            'senior': ['senior', 'lead', 'principal', '5+ years', 'experienced', 'staff']
        }
        
        if level.lower() in level_keywords:
            keywords = level_keywords[level.lower()]
            return any(keyword in combined for keyword in keywords)
        
        return True

# Create singleton instance
job_scraper = JobScraper()
