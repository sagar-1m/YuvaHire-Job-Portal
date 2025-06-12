Steps to testing of endpoints:

1. test the initial setup endpoint to create the super admin and system college.
2. login as the super admin and verify the creation of the system college.
3. test the admin application endpoint to apply for a college admin role.
4. verify the email of admin applications.
5. list all admin applications to ensure the super admin can see them.
6. review an admin application and approve it to create a college admin.
7. login as newly created college admin.
8. create a job posting as the college admin.
9. register a student who belongs to the college.
10. verify the student email using self-service verification or admin verification using student record ID.
11. login as the student now.
12. student now can view jobs posted by their college.
13. student can apply for a job using resume url which is optional.
14. student can view their own applications.
15. now login as the college admin.
16. colleg admin can view all applications for the jobs posted by them using job ID.
17. college admin can update the status of applications (e.g., accept, reject).
18. again login as the student.
19. student can view the status of their applications after college admin updates them.
20. again login as the super admin.
21. view all colleges by super admin.
22. get college details by ID by super admin.
23. Update college details by ID by college admin.
24. Get all students in a college by college admin.
25. get all jobs posted by a college admin by filtering by college ID.
26. get job details by ID as college admin.
27. get job details by ID as student.
28. Update job details by ID as college admin.
29. Delete job by ID as college admin by creatin a new job for the same college.
30. Test forgot password endpoint by requesting a reset link.
31. Test reset password endpoint by using the reset link.
32. refresh the access token using the refresh token endpoint.
33. Get student details by ID as college admin.
34. Assign a student to a college by college admin by providing student ID.
