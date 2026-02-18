#!/usr/bin/env python3
"""
Backend API Test Suite for JobFlow Application
Tests all API endpoints with session-based authentication
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class JobFlowAPITester:
    def __init__(self, base_url="https://apply-daily-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1771375733846"
        self.user_id = "test-user-1771375733846"
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Set session cookie for all requests
        self.session.cookies.set('session_token', self.session_token, 
                               domain='apply-daily-1.preview.emergentagent.com')

    def log_test(self, name, success, message="", response=None):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if message:
            print(f"    {message}")
        if not success and response:
            print(f"    Response: {response.text[:200]}")
        if success:
            self.tests_passed += 1
        print()

    def test_auth(self):
        """Test authentication endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me")
            success = response.status_code == 200
            if success:
                data = response.json()
                user_match = data.get('user_id') == self.user_id
                self.log_test("Authentication - /api/auth/me", user_match, 
                            f"User ID: {data.get('user_id', 'Not found')}")
                return user_match
            else:
                self.log_test("Authentication - /api/auth/me", False, 
                            f"Status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_test("Authentication - /api/auth/me", False, f"Error: {str(e)}")
            return False

    def test_jobs_crud(self):
        """Test job CRUD operations"""
        job_id = None
        
        # Test create job
        try:
            job_data = {
                "title": "Backend Test Job",
                "company": "Test Company",
                "location": "Remote",
                "job_url": "https://example.com/job",
                "source": "Test API",
                "description": "This is a test job for API testing",
                "salary_range": "$80k - $100k",
                "status": "saved"
            }
            
            response = self.session.post(f"{self.base_url}/api/jobs", json=job_data)
            success = response.status_code in [200, 201]
            if success:
                data = response.json()
                job_id = data.get('job_id')
                self.log_test("Jobs - Create Job", True, f"Job ID: {job_id}")
            else:
                self.log_test("Jobs - Create Job", False, 
                            f"Status: {response.status_code}", response)
                return False
                
        except Exception as e:
            self.log_test("Jobs - Create Job", False, f"Error: {str(e)}")
            return False
        
        # Test get all jobs
        try:
            response = self.session.get(f"{self.base_url}/api/jobs")
            success = response.status_code == 200 and isinstance(response.json(), list)
            if success:
                jobs = response.json()
                self.log_test("Jobs - Get All Jobs", True, f"Found {len(jobs)} jobs")
            else:
                self.log_test("Jobs - Get All Jobs", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Jobs - Get All Jobs", False, f"Error: {str(e)}")
        
        if not job_id:
            return False
            
        # Test get specific job
        try:
            response = self.session.get(f"{self.base_url}/api/jobs/{job_id}")
            success = response.status_code == 200
            if success:
                job = response.json()
                title_match = job.get('title') == job_data['title']
                self.log_test("Jobs - Get Specific Job", title_match, 
                            f"Title: {job.get('title')}")
            else:
                self.log_test("Jobs - Get Specific Job", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Jobs - Get Specific Job", False, f"Error: {str(e)}")
        
        # Test update job
        try:
            update_data = {"status": "applied", "notes": "Test update from API"}
            response = self.session.put(f"{self.base_url}/api/jobs/{job_id}", json=update_data)
            success = response.status_code == 200
            if success:
                self.log_test("Jobs - Update Job", True, "Status updated to applied")
            else:
                self.log_test("Jobs - Update Job", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Jobs - Update Job", False, f"Error: {str(e)}")
        
        return job_id

    def test_ai_features(self, job_description="Software engineer role with Python, FastAPI, and React experience"):
        """Test AI features"""
        
        # Test job analysis
        try:
            response = self.session.post(f"{self.base_url}/api/ai/analyze-job", 
                                       json={"job_description": job_description})
            success = response.status_code == 200
            if success:
                data = response.json()
                has_score = 'match_score' in data
                self.log_test("AI - Job Analysis", has_score, 
                            f"Match score: {data.get('match_score', 'Not found')}")
            else:
                self.log_test("AI - Job Analysis", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("AI - Job Analysis", False, f"Error: {str(e)}")
        
        # Test cover letter generation
        try:
            response = self.session.post(f"{self.base_url}/api/ai/generate-cover-letter", 
                                       json={"job_description": job_description})
            success = response.status_code == 200
            if success:
                data = response.json()
                has_letter = 'cover_letter' in data and len(data['cover_letter']) > 50
                self.log_test("AI - Cover Letter Generation", has_letter, 
                            f"Generated {len(data.get('cover_letter', ''))} characters")
            else:
                self.log_test("AI - Cover Letter Generation", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("AI - Cover Letter Generation", False, f"Error: {str(e)}")
        
        # Test email generation
        try:
            email_data = {
                "job_title": "Software Engineer",
                "company": "Tech Corp",
                "contact_person": "Jane Smith",
                "email_type": "application"
            }
            response = self.session.post(f"{self.base_url}/api/ai/generate-email", json=email_data)
            success = response.status_code == 200
            if success:
                data = response.json()
                has_email = 'email' in data and len(data['email']) > 50
                self.log_test("AI - Email Generation", has_email, 
                            f"Generated {len(data.get('email', ''))} characters")
            else:
                self.log_test("AI - Email Generation", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("AI - Email Generation", False, f"Error: {str(e)}")

    def test_daily_goals(self):
        """Test daily goals functionality"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Test get/create daily goal
        try:
            response = self.session.get(f"{self.base_url}/api/goals/daily/{today}")
            if response.status_code == 404:
                # Create daily goal
                goal_data = {"applications_goal": 3, "networking_goal": 1}
                response = self.session.post(f"{self.base_url}/api/goals/daily/{today}", json=goal_data)
            
            success = response.status_code in [200, 201]
            if success:
                data = response.json()
                has_goals = 'applications_goal' in data
                self.log_test("Daily Goals - Get/Create", has_goals, 
                            f"Applications goal: {data.get('applications_goal', 'Not found')}")
            else:
                self.log_test("Daily Goals - Get/Create", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Daily Goals - Get/Create", False, f"Error: {str(e)}")

    def test_tasks_crud(self):
        """Test tasks CRUD operations"""
        task_id = None
        
        # Create task
        try:
            task_data = {
                "title": "Test API Task",
                "description": "This is a test task",
                "priority": "high",
                "due_date": (datetime.now() + timedelta(days=1)).isoformat()
            }
            response = self.session.post(f"{self.base_url}/api/tasks", json=task_data)
            success = response.status_code in [200, 201]
            if success:
                data = response.json()
                task_id = data.get('task_id')
                self.log_test("Tasks - Create Task", True, f"Task ID: {task_id}")
            else:
                self.log_test("Tasks - Create Task", False, 
                            f"Status: {response.status_code}", response)
                return
        except Exception as e:
            self.log_test("Tasks - Create Task", False, f"Error: {str(e)}")
            return
        
        # Get all tasks
        try:
            response = self.session.get(f"{self.base_url}/api/tasks")
            success = response.status_code == 200 and isinstance(response.json(), list)
            if success:
                tasks = response.json()
                self.log_test("Tasks - Get All Tasks", True, f"Found {len(tasks)} tasks")
            else:
                self.log_test("Tasks - Get All Tasks", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Tasks - Get All Tasks", False, f"Error: {str(e)}")

        if task_id:
            # Update task
            try:
                update_data = {"completed": True}
                response = self.session.put(f"{self.base_url}/api/tasks/{task_id}", json=update_data)
                success = response.status_code == 200
                self.log_test("Tasks - Update Task", success, 
                            "Task marked as completed" if success else f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Tasks - Update Task", False, f"Error: {str(e)}")

    def test_reminders(self, job_id):
        """Test reminders functionality"""
        if not job_id:
            self.log_test("Reminders - Skipped", False, "No job_id available")
            return
            
        try:
            reminder_data = {
                "job_id": job_id,
                "reminder_date": (datetime.now() + timedelta(days=2)).isoformat(),
                "message": "Follow up on application"
            }
            response = self.session.post(f"{self.base_url}/api/reminders", json=reminder_data)
            success = response.status_code in [200, 201]
            if success:
                data = response.json()
                reminder_id = data.get('reminder_id')
                self.log_test("Reminders - Create Reminder", True, f"Reminder ID: {reminder_id}")
            else:
                self.log_test("Reminders - Create Reminder", False, 
                            f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_test("Reminders - Create Reminder", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("JobFlow Backend API Test Suite")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Session: {self.session_token}")
        print("=" * 60)
        
        # Test authentication first
        if not self.test_auth():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Test core functionality
        job_id = self.test_jobs_crud()
        self.test_ai_features()
        self.test_daily_goals()
        self.test_tasks_crud()
        self.test_reminders(job_id)
        
        # Print summary
        print("=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Backend is working excellently!")
        elif success_rate >= 70:
            print("✅ Backend is working well with minor issues")
        else:
            print("⚠️  Backend has significant issues that need attention")
        
        print("=" * 60)
        
        return success_rate >= 70

def main():
    tester = JobFlowAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())