-- ============================================================================
-- Seed data for Principle AI (demo content).
-- Safe to run multiple times (uses stable slugs / on conflict guards where
-- possible). Companies, sources, jobs, and referral opportunities only —
-- user-scoped data is created at runtime.
-- ============================================================================

-- ---- Job sources (ingestion adapters) ----
insert into public.job_sources (id, name, kind, base_url, trust_weight, enabled)
values
  ('11111111-1111-1111-1111-111111111101', 'Company Career Pages', 'career_page', null, 0.90, true),
  ('11111111-1111-1111-1111-111111111102', 'Public Job Feeds',     'public_feed', null, 0.70, true),
  ('11111111-1111-1111-1111-111111111103', 'X Hiring Signals',     'x_signal',    null, 0.45, true),
  ('11111111-1111-1111-1111-111111111104', 'User Submitted Posts', 'user_submitted', null, 0.40, true),
  ('11111111-1111-1111-1111-111111111105', 'Approved API Provider','api_provider', null, 0.85, true)
on conflict (id) do nothing;

-- ---- Companies ----
insert into public.companies (id, name, slug, website, industry, hq_location, verified)
values
  ('22222222-2222-2222-2222-222222222201', 'Razorpay',    'razorpay',    'https://razorpay.com',    'Fintech',        'Bangalore', true),
  ('22222222-2222-2222-2222-222222222202', 'Zomato',      'zomato',      'https://zomato.com',      'Food Tech',      'Gurugram',  true),
  ('22222222-2222-2222-2222-222222222203', 'Groww',       'groww',       'https://groww.in',        'Fintech',        'Bangalore', true),
  ('22222222-2222-2222-2222-222222222204', 'Zepto',       'zepto',       'https://zepto.co.in',     'Quick Commerce', 'Mumbai',    true),
  ('22222222-2222-2222-2222-222222222205', 'Postman',     'postman',     'https://postman.com',     'Developer Tools','Bangalore', true),
  ('22222222-2222-2222-2222-222222222206', 'CRED',        'cred',        'https://cred.club',       'Fintech',        'Bangalore', true),
  ('22222222-2222-2222-2222-222222222207', 'Meesho',      'meesho',      'https://meesho.com',      'E-commerce',     'Bangalore', true)
on conflict (id) do nothing;

-- ---- Jobs ----
-- Mix of hidden-manager posts and normal listings, varied freshness.
insert into public.jobs (
  id, company_id, source_id, company_name, role, description, location, work_mode,
  experience_min, experience_max, salary_min, salary_max, salary_currency, salary_period,
  required_skills, application_method, application_url, application_email,
  contact_person, contact_role, is_hiring_manager_post, is_hidden_job,
  hidden_job_score, scam_score, confidence_score, status, posted_at, deadline
) values
  (
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111103',
    'Razorpay', 'Product Management Intern',
    'We are looking for a PM intern to work on payments growth. You will run experiments, write PRDs, and work closely with engineering and design. Strong analytical skills and curiosity about fintech preferred.',
    'Bangalore', 'hybrid',
    0, 1, 25000, 40000, 'INR', 'month',
    array['Product Sense','Analytics','SQL','Communication','Wireframing'],
    'dm', null, null,
    'Ananya Rao', 'Growth Lead', true, true,
    92, 4, 95, 'approved', now() - interval '8 minutes', now() + interval '20 days'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111101',
    'Postman', 'Associate Software Engineer',
    'Join the API platform team. Build features across the stack using TypeScript, React, and Go. New grads welcome.',
    'Bangalore', 'onsite',
    0, 2, 1200000, 1800000, 'INR', 'year',
    array['TypeScript','React','Node.js','Go','REST APIs'],
    'url', 'https://postman.com/careers', null,
    null, null, false, false,
    10, 2, 88, 'approved', now() - interval '3 hours', now() + interval '30 days'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Groww', 'Data Analyst Intern',
    'Hiring a data analyst intern to support the product analytics team. Work with SQL, Python, and dashboards. DM your resume if interested!',
    'Bangalore', 'remote',
    0, 1, 20000, 30000, 'INR', 'month',
    array['SQL','Python','Excel','Data Visualization','Statistics'],
    'dm', null, null,
    'Rohit Mehra', 'Analytics Manager', true, true,
    85, 6, 90, 'approved', now() - interval '1 hour', now() + interval '15 days'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    'Zomato', 'Frontend Engineer (New Grad)',
    'Build delightful consumer experiences with React and Next.js. Looking for strong fundamentals in JS and CSS.',
    'Gurugram', 'hybrid',
    0, 2, 1400000, 2000000, 'INR', 'year',
    array['JavaScript','React','Next.js','CSS','HTML'],
    'url', 'https://zomato.com/careers', null,
    null, null, false, false,
    8, 2, 86, 'approved', now() - interval '26 hours', now() + interval '25 days'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111103',
    'Zepto', 'Growth Marketing Intern',
    'We are hiring a growth marketing intern to run performance campaigns and analyze funnels. Reach out if you love data-driven marketing.',
    'Mumbai', 'onsite',
    0, 1, 22000, 35000, 'INR', 'month',
    array['Marketing','Analytics','Google Ads','SQL','Content'],
    'email', null, 'careers@zepto.co.in',
    'Priya Nair', 'Growth Manager', true, true,
    80, 8, 84, 'approved', now() - interval '5 hours', now() + interval '18 days'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111101',
    'CRED', 'Backend Engineer Intern',
    'Work on high-scale backend systems. Java/Kotlin, microservices, and distributed systems exposure is a plus.',
    'Bangalore', 'onsite',
    0, 1, 40000, 60000, 'INR', 'month',
    array['Java','Kotlin','Microservices','SQL','System Design'],
    'url', 'https://cred.club/careers', null,
    null, null, false, false,
    12, 3, 83, 'approved', now() - interval '2 days', now() + interval '22 days'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111104',
    'Meesho', 'Associate Product Manager',
    'APM role for new grads. Own a product area, drive metrics, and collaborate cross-functionally. Join our team!',
    'Bangalore', 'hybrid',
    0, 2, 1800000, 2600000, 'INR', 'year',
    array['Product Sense','Analytics','SQL','Stakeholder Management','Communication'],
    'url', 'https://meesho.com/careers', null,
    null, null, false, false,
    15, 3, 82, 'approved', now() - interval '10 hours', now() + interval '28 days'
  )
on conflict (id) do nothing;

-- ---- Referral opportunities (evidence-backed) ----
insert into public.referral_opportunities (
  id, company_id, company_name, person_name, person_role, profile_url,
  referral_post_url, post_text, roles_mentioned, referral_evidence,
  confidence_score, posted_at
) values
  (
    '44444444-4444-4444-4444-444444444401',
    '22222222-2222-2222-2222-222222222201',
    'Razorpay', 'Ananya Rao', 'Growth',
    'https://example.com/profile/ananya-rao',
    'https://example.com/post/ananya-referral',
    'Happy to refer candidates for growth and product roles at Razorpay. Drop me a note with your resume and the role you are targeting.',
    array['Growth','Product','Product Management'],
    'Public post: "Happy to refer candidates for growth/product roles at Razorpay."',
    90, now() - interval '2 days'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '22222222-2222-2222-2222-222222222203',
    'Groww', 'Rohit Mehra', 'Analytics Manager',
    'https://example.com/profile/rohit-mehra',
    'https://example.com/post/rohit-referral',
    'My team is growing. I can refer strong candidates for data analyst and analytics roles. Open to new grads with solid SQL.',
    array['Data Analyst','Analytics','Data Science'],
    'Public post: willing to refer for data analyst / analytics roles, new grads welcome.',
    85, now() - interval '4 days'
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '22222222-2222-2222-2222-222222222207',
    'Meesho', 'Karthik Iyer', 'Senior PM',
    'https://example.com/profile/karthik-iyer',
    'https://example.com/post/karthik-referral',
    'Referrals open for APM and product roles at Meesho this quarter. Share your portfolio.',
    array['APM','Product Management','Product'],
    'Public post: referrals open for APM/product roles this quarter.',
    78, now() - interval '6 days'
  )
on conflict (id) do nothing;
