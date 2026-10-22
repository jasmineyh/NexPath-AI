import type { Profile } from '@workspace/api-client-react';

export const DEMO_PROFILE: Profile = {
  name: 'Alex Tan',
  educationLevel: "Bachelor's degree",
  major: 'BSc Computer Science',
  institution: 'Universiti Malaya',
  status: 'fresh graduate',
  experiences: [
    {
      title: 'Software Developer Intern',
      org: 'Lintas Pay (fintech startup, Kuala Lumpur)',
      description: 'Built internal REST APIs for the payments dashboard and fixed bugs reported by the operations team.',
      kind: 'internship',
    },
    {
      title: 'Final-year project: Campus Food Waste Tracker',
      org: 'Universiti Malaya',
      description: 'Built a web app that logged cafeteria food waste and produced weekly charts and reports for the facilities office.',
      kind: 'project',
    },
  ],
  technicalSkills: ['Python', 'Java', 'SQL (basic)'],
  humanSkills: ['Teamwork', 'Communication', 'Problem-solving'],
  selfDescription: 'I like turning messy data into charts and reports that help people make decisions. I can write small backend services and explain technical results to non-technical teammates.',
  interests: 'AI, data analytics',
  goals: 'Land a data-focused role in Malaysia within a year and keep learning applied AI.',
};

export const EDUCATION_LEVELS = ['SPM / O-Level', 'STPM / A-Level / Foundation', 'Diploma', "Bachelor's degree", "Master's degree", 'PhD'];
export const STATUSES = [
  { value: 'student', label: 'Student' },
  { value: 'fresh graduate', label: 'Fresh graduate' },
  { value: 'employed', label: 'Employed' },
  { value: 'career switcher', label: 'Career switcher' },
];
