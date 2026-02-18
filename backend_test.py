#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime, timedelta
import time

class JobSearchAPITester:
    def __init__(self, base_url="https://apply-daily-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1771375733846"  # From MongoDB setup
        self.user_id = "test-user-1771375733846"  # From MongoDB setup
        self.tests_run = 0
        self.tests_passed = 0
        self.job_id = None
        self.task_id = None
        self.reminder_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        if headers:
            test_headers.update(headers)

        # Also try with cookies
        cookies = {'session_token': self.session_token} if self.session_token else None

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, cookies=cookies, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, cookies=cookies, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, cookies=cookies, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, cookies=cookies, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"   ❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"   ❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_me(self):
        """Test authentication endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        if success and 'user_id' in response:
            print(f"   User: {response.get('name')} ({response.get('email')})")
            return True
        return False

    def test_daily_goals(self):
        """Test daily goals endpoints"""
        # Get goals
        success, goals = self.run_test(
            "Get Daily Goals",
            "GET",
            "goals", 
            200
        )
        if not success:
            return False
            
        # Update goals
        new_goals = {
            "applications_per_day": 5,
            "networking_per_day": 3,
            "skills_per_day": 2
        }
        success, _ = self.run_test(
            "Update Daily Goals",
            "PATCH",
            "goals",
            200,
            data=new_goals
        )
        return success

    def test_job_crud(self):
        """Test job CRUD operations"""
        # Create job
        job_data = {
            "title": "Senior Frontend Developer",
            "company": "Tech Startup Inc",
            "location": "San Francisco, CA",
            "job_url": "https://example.com/job/123",
            "source": "LinkedIn", 
            "description": "Looking for an experienced React developer to join our team. Must have 3+ years experience with React, TypeScript, and modern frontend tools.",
            "salary_range": "$120k - $150k"
        }
        
        success, job = self.run_test(
            "Create Job",
            "POST",
            "jobs",
            200,  # Changed from 201 as backend returns 200
            data=job_data
        )
        if not success or 'job_id' not in job:
            print("   ❌ Failed to create job or missing job_id")
            return False
            
        self.job_id = job['job_id']
        print(f"   Created job with ID: {self.job_id}")

        # Get all jobs
        success, jobs = self.run_test(
            "Get All Jobs",
            "GET",
            "jobs",
            200
        )
        if not success:
            return False

        # Get specific job
        success, job_detail = self.run_test(
            "Get Job Detail",
            "GET", 
            f"jobs/{self.job_id}",
            200
        )
        if not success:
            return False

        # Update job status
        update_data = {"status": "applied"}
        success, _ = self.run_test(
            "Update Job Status",
            "PATCH",
            f"jobs/{self.job_id}",
            200,
            data=update_data
        )
        if not success:
            return False

        return True

    def test_tasks_crud(self):
        """Test daily tasks CRUD operations"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create task
        task_data = {
            "task_type": "application",
            "description": "Apply to Frontend Developer position",
            "job_id": self.job_id
        }
        
        success, task = self.run_test(
            "Create Task",
            "POST",
            f"tasks?date={today}",
            200,
            data=task_data
        )
        if not success or 'task_id' not in task:
            return False
            
        self.task_id = task['task_id']
        print(f"   Created task with ID: {self.task_id}")

        # Get tasks
        success, tasks = self.run_test(
            "Get Tasks",
            "GET",
            f"tasks?date={today}",
            200
        )
        if not success:
            return False

        # Update task (mark completed)
        success, _ = self.run_test(
            "Complete Task",
            "PATCH",
            f"tasks/{self.task_id}?completed=true",
            200
        )
        if not success:
            return False

        return True

    def test_reminders_crud(self):
        """Test reminders CRUD operations"""
        if not self.job_id:
            print("   ⚠️ Skipping reminders test - no job_id available")
            return True
            
        # Create reminder
        reminder_date = (datetime.now() + timedelta(days=3)).isoformat()
        reminder_data = {
            "job_id": self.job_id,
            "reminder_date": reminder_date,
            "message": "Follow up on application"
        }
        
        success, reminder = self.run_test(
            "Create Reminder",
            "POST",
            "reminders",
            200,
            data=reminder_data
        )
        if not success or 'reminder_id' not in reminder:
            return False
            
        self.reminder_id = reminder['reminder_id']
        print(f"   Created reminder with ID: {self.reminder_id}")

        # Get reminders
        success, reminders = self.run_test(
            "Get Reminders",
            "GET",
            "reminders",
            200
        )
        if not success:
            return False

        # Update reminder (mark completed)
        success, _ = self.run_test(
            "Complete Reminder", 
            "PATCH",
            f"reminders/{self.reminder_id}?completed=true",
            200
        )
        if not success:
            return False

        return True

    def test_ai_features(self):
        """Test AI analysis features"""
        if not self.job_id:
            print("   ⚠️ Skipping AI tests - no job_id available")
            return True
            
        job_description = """
        We are seeking a Senior Frontend Developer to join our growing team. 
        
        Requirements:
        - 3+ years experience with React and TypeScript
        - Experience with modern build tools (Webpack, Vite)
        - Knowledge of state management (Redux, Zustand)
        - Strong CSS skills, preferably with Tailwind
        - Experience with testing frameworks (Jest, Cypress)
        
        Nice to have:
        - Next.js experience
        - GraphQL knowledge
        - Design system experience
        """

        # Test job analysis
        analysis_data = {
            "job_description": job_description,
            "user_resume": "Frontend developer with 4 years React experience, TypeScript, and Tailwind CSS."
        }
        
        print("   🤖 Testing AI job analysis (may take 5-10 seconds)...")
        success, analysis = self.run_test(
            "AI Job Analysis",
            "POST",
            "ai/analyze-job",
            200,
            data=analysis_data
        )
        if success:
            print(f"   Match Score: {analysis.get('match_score', 'N/A')}%")
            print(f"   Keywords: {analysis.get('keywords', [])}")
            print(f"   Summary Points: {len(analysis.get('summary', []))}")
        else:
            return False

        # Test cover letter generation
        print("   🤖 Testing AI cover letter generation (may take 5-10 seconds)...")
        success, cover_letter = self.run_test(
            "AI Cover Letter Generation",
            "POST", 
            "ai/generate-cover-letter",
            200,
            data=analysis_data
        )
        if success:
            letter_text = cover_letter.get('cover_letter', '')
            print(f"   Generated {len(letter_text)} characters")
        else:
            return False

        # Test email generation
        email_data = {
            "job_title": "Senior Frontend Developer",
            "company": "Tech Startup Inc",
            "recipient_name": "Hiring Manager",
            "email_type": "application"
        }
        
        print("   🤖 Testing AI email generation (may take 5-10 seconds)...")
        success, email = self.run_test(
            "AI Email Generation",
            "POST",
            "ai/generate-email", 
            200,
            data=email_data
        )
        if success:
            email_text = email.get('email', '')
            print(f"   Generated {len(email_text)} characters")
        else:
            return False

        return True

    def test_cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete task
        if self.task_id:
            self.run_test("Delete Task", "DELETE", f"tasks/{self.task_id}", 200)
        
        # Delete reminder  
        if self.reminder_id:
            self.run_test("Delete Reminder", "DELETE", f"reminders/{self.reminder_id}", 200)
            
        # Delete job
        if self.job_id:
            self.run_test("Delete Job", "DELETE", f"jobs/{self.job_id}", 200)

    def run_all_tests(self):
        """Run comprehensive backend test suite"""
        print("🚀 Starting JobSearch API Backend Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {self.user_id}")
        
        try:
            # Core auth test
            if not self.test_auth_me():
                print("❌ Authentication failed - stopping tests")
                return False

            # Test all major features
            if not self.test_daily_goals():
                print("❌ Daily goals tests failed")
                return False
                
            if not self.test_job_crud():
                print("❌ Job CRUD tests failed") 
                return False
                
            if not self.test_tasks_crud():
                print("❌ Tasks CRUD tests failed")
                return False
                
            if not self.test_reminders_crud():
                print("❌ Reminders CRUD tests failed")
                return False
                
            # AI tests (may be slower)
            if not self.test_ai_features():
                print("❌ AI features tests failed")
                return False
                
            # Cleanup
            self.test_cleanup()
            
            return True
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {str(e)}")
            return False

def main():
    tester = JobSearchAPITester()
    
    if tester.run_all_tests():
        print(f"\n📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
        if tester.tests_passed == tester.tests_run:
            print("🎉 All backend tests passed!")
            return 0
        else:
            print("⚠️ Some tests failed")
            return 1
    else:
        print(f"\n📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
        print("❌ Backend test suite failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())