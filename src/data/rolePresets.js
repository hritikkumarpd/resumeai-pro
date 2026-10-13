/**
 * Industry-standard sample resume presets.
 * Formatted with Google XYZ formula (Accomplished [X] measured by [Y] by doing [Z]).
 */

export const ROLE_PRESETS = [
  {
    id: 'sde_fullstack',
    title: 'Full-Stack Software Engineer (React / Node / Cloud)',
    roleCategory: 'Software Engineering',
    tag: 'SDE II / Mid-Senior',
    data: {
      personal: {
        name: 'Arjun Mehta',
        title: 'Full-Stack Software Engineer',
        email: 'arjun.mehta.dev@gmail.com',
        phone: '+91 98765 43210',
        location: 'Bengaluru, India',
        linkedin: 'linkedin.com/in/arjun-mehta-dev',
        website: 'github.com/arjunmehta',
        photo: ''
      },
      summary: 'Results-driven Full-Stack Engineer with 3+ years of experience building scalable web applications and microservices. Expert in React, TypeScript, Node.js, and AWS cloud infrastructure. Led architecture overhaul for high-throughput payment pipelines processing 2M+ monthly transactions with 99.99% uptime.',
      experience: [
        {
          id: 101,
          company: 'Razorpay Technologies',
          role: 'Software Development Engineer II',
          period: 'Jul 2023 – Present',
          location: 'Bengaluru, India',
          bullets: [
            'Architected distributed event-driven payment webhook gateway handling 15,000+ requests/sec with p99 latency < 45ms using Node.js, Kafka, and Redis.',
            'Engineered automated reconciliation pipeline that eliminated manual processing errors by 98% and saved 120 engineering hours monthly.',
            'Spearheaded migration of legacy monolithic checkout UI to modular Next.js SSR architecture, improving Lighthouse performance score from 62 to 94.',
            'Mentored 4 junior engineers on clean architecture, comprehensive unit testing (90%+ coverage), and CI/CD best practices.'
          ]
        },
        {
          id: 102,
          company: 'Zomato Media',
          role: 'Software Development Engineer I',
          period: 'Aug 2021 – Jun 2023',
          location: 'Gurugram, India',
          bullets: [
            'Developed real-time order tracking dashboard serving 4.5M daily active users using React, WebSockets, and TailwindCSS.',
            'Optimized PostgreSQL query execution plans and Redis caching layer, decreasing database CPU load by 35% during peak dinner hours.',
            'Implemented automated end-to-end integration test suites with Playwright, cutting deployment regression bugs by 42% across 14 release cycles.'
          ]
        }
      ],
      education: [
        {
          id: 201,
          school: 'National Institute of Technology (NIT), Surathkal',
          degree: 'B.Tech in Computer Science and Engineering',
          period: '2017 – 2021',
          gpa: '8.84 / 10.0 CGPA'
        }
      ],
      skills: [
        'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Node.js',
        'Express.js', 'PostgreSQL', 'Redis', 'MongoDB', 'Docker',
        'Kubernetes', 'AWS (S3, EC2, Lambda)', 'Kafka', 'GraphQL', 'TailwindCSS'
      ],
      skillCategories: {
        'JavaScript': 'Frontend',
        'TypeScript': 'Frontend',
        'React.js': 'Frontend',
        'Next.js': 'Frontend',
        'TailwindCSS': 'Frontend',
        'Node.js': 'Backend',
        'Express.js': 'Backend',
        'GraphQL': 'Backend',
        'PostgreSQL': 'Database',
        'Redis': 'Database',
        'MongoDB': 'Database',
        'Docker': 'DevOps & Cloud',
        'Kubernetes': 'DevOps & Cloud',
        'AWS (S3, EC2, Lambda)': 'DevOps & Cloud',
        'Kafka': 'DevOps & Cloud'
      },
      projects: [
        {
          id: 301,
          name: 'CloudSync — Distributed File Storage Engine',
          desc: 'Built multi-tenant object storage microservice with chunked parallel uploads, client-side encryption (AES-256), and automated CDN replication. Benchmarked 3.2x faster download throughput than standard S3 multipart transfers.',
          link: 'github.com/arjunmehta/cloudsync'
        },
        {
          id: 302,
          name: 'DevPulse — Real-Time API Health Monitor',
          desc: 'Developed synthetic API pinging and status page SaaS with sub-minute alert dispatch via Discord and Slack webhooks. Scaled to monitor 850+ endpoints with 0 false-positive reports.',
          link: 'github.com/arjunmehta/devpulse'
        }
      ],
      certifications: [
        { id: 401, name: 'AWS Certified Solutions Architect – Associate (SAA-C03)', year: '2023' }
      ]
    }
  },
  {
    id: 'ai_ml_engineer',
    title: 'AI / Machine Learning Engineer (PyTorch / LLMs / RAG)',
    roleCategory: 'Artificial Intelligence',
    tag: 'GenAI & Applied ML',
    data: {
      personal: {
        name: 'Priya Sharma',
        title: 'Machine Learning & GenAI Engineer',
        email: 'priya.sharma.ml@gmail.com',
        phone: '+91 91234 56789',
        location: 'Hyderabad, India',
        linkedin: 'linkedin.com/in/priya-sharma-ai',
        website: 'github.com/priyasharma-ml',
        photo: ''
      },
      summary: 'Applied Machine Learning Engineer with 3+ years specializing in Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and computer vision pipelines. Proven track record deploying quantized neural models on edge and cloud clusters, reducing inference latency by 45% while maintaining 94%+ F1 accuracy.',
      experience: [
        {
          id: 101,
          company: 'HyperVerge AI',
          role: 'Senior Machine Learning Engineer',
          period: 'Jan 2023 – Present',
          location: 'Bengaluru, India',
          bullets: [
            'Architected enterprise RAG system incorporating hybrid vector-lexical search (Qdrant + BM25) and cross-encoder re-ranking, boosting answer retrieval precision by 28%.',
            'Fine-tuned open-source LLMs (Llama-3 8B, Mistral) using LoRA and QLoRA for domain-specific contract extraction with 96.2% field accuracy.',
            'Optimized model deployment with vLLM and TensorRT-LLM on NVIDIA A100 GPUs, cutting token generation latency from 110ms to 28ms per token.',
            'Automated ML evaluation pipelines using LangSmith and Ragas to track hallucination rates and grounding consistency across 50,000+ daily queries.'
          ]
        },
        {
          id: 102,
          company: 'Fractal Analytics',
          role: 'Machine Learning Engineer',
          period: 'Jul 2021 – Dec 2022',
          location: 'Hyderabad, India',
          bullets: [
            'Developed customer churn prediction system utilizing XGBoost and LightGBM over 12M customer profiles, identifying $4.2M in preventable churn revenue.',
            'Created automated ETL feature store with Feast and Apache Spark, reducing feature training-serving skew from 8.4% to zero.',
            'Built real-time model drift monitoring dashboard with Evidently AI, triggering automated model retraining when population drift exceeded 5%.'
          ]
        }
      ],
      education: [
        {
          id: 201,
          school: 'Indian Institute of Technology (IIT), Kharagpur',
          degree: 'B.Tech in Artificial Intelligence & Data Science',
          period: '2017 – 2021',
          gpa: '9.12 / 10.0 CGPA'
        }
      ],
      skills: [
        'Python', 'PyTorch', 'TensorFlow', 'Hugging Face', 'LangChain',
        'LlamaIndex', 'vLLM', 'FastAPI', 'Docker', 'Qdrant',
        'Pinecone', 'MLflow', 'Kubernetes', 'SQL', 'Scikit-Learn'
      ],
      skillCategories: {
        'Python': 'Core Languages',
        'SQL': 'Core Languages',
        'PyTorch': 'ML Frameworks',
        'TensorFlow': 'ML Frameworks',
        'Scikit-Learn': 'ML Frameworks',
        'Hugging Face': 'GenAI & NLP',
        'LangChain': 'GenAI & NLP',
        'LlamaIndex': 'GenAI & NLP',
        'vLLM': 'GenAI & NLP',
        'Qdrant': 'Vector DBs',
        'Pinecone': 'Vector DBs',
        'FastAPI': 'Deployment & Cloud',
        'Docker': 'Deployment & Cloud',
        'Kubernetes': 'Deployment & Cloud',
        'MLflow': 'Deployment & Cloud'
      },
      projects: [
        {
          id: 301,
          name: 'DocuQuery — Multi-Modal Financial Document RAG',
          desc: 'Developed multi-modal document intelligence pipeline extracting structured financials from 1,000+ page annual reports using OCR + ColPali embeddings and LangGraph reasoning agents.',
          link: 'github.com/priyasharma-ml/docuquery'
        },
        {
          id: 302,
          name: 'FastDistill — Knowledge Distillation Toolkit',
          desc: 'Open-source PyTorch toolkit for compressing large vision transformers into mobile-friendly MobileNet backbones with under 1.5% accuracy degradation. 450+ GitHub stars.',
          link: 'github.com/priyasharma-ml/fastdistill'
        }
      ],
      certifications: [
        { id: 401, name: 'DeepLearning.AI TensorFlow Developer Specialization', year: '2022' }
      ]
    }
  },
  {
    id: 'product_manager',
    title: 'Product Manager (B2B SaaS / Growth / Analytics)',
    roleCategory: 'Product Management',
    tag: 'PM / Growth Lead',
    data: {
      personal: {
        name: 'Rohan Verma',
        title: 'Senior Product Manager',
        email: 'rohan.verma.pm@gmail.com',
        phone: '+91 99887 76655',
        location: 'Mumbai, India',
        linkedin: 'linkedin.com/in/rohan-verma-pm',
        website: 'rohanverma.co',
        photo: ''
      },
      summary: 'Data-driven Product Manager with 4+ years leading cross-functional teams across engineering, design, and go-to-market. Owned end-to-end user onboarding lifecycle, driving a 34% increase in Day-30 retention and $1.8M ARR expansion. Passionate about rapid experimentation, PLG, and customer discovery.',
      experience: [
        {
          id: 101,
          company: 'Postman',
          role: 'Product Manager – Growth & Onboarding',
          period: 'Sep 2022 – Present',
          location: 'Bengaluru, India',
          bullets: [
            'Spearheaded redesigned user activation funnel across web and desktop apps, increasing trial-to-paid conversion rate by 22% and generating $1.4M incremental ARR.',
            'Conducted 65+ qualitative user discovery interviews and paired insights with Amplitude analytics to identify key user drop-off bottlenecks in workspace sharing.',
            'Collaborated with 14 engineers and 2 UX designers using Agile Scrum methodology, maintaining consistent 92% sprint commitment delivery.',
            'Designed and executed 28 statistical A/B experiments to optimize pricing page tier discovery, improving enterprise contact form submissions by 31%.'
          ]
        },
        {
          id: 102,
          company: 'CleverTap',
          role: 'Associate Product Manager',
          period: 'Jul 2020 – Aug 2022',
          location: 'Mumbai, India',
          bullets: [
            'Owned self-serve marketing campaign builder module used by 1,200+ global brands sending 8B+ notifications monthly.',
            'Partnered with customer success teams to prioritize top 10 feature requests into quarterly roadmap, boosting NPS from 48 to 67.',
            'Launched integrated template marketplace that reduced campaign creation time for new users from 45 minutes to under 8 minutes.'
          ]
        }
      ],
      education: [
        {
          id: 201,
          school: 'Birla Institute of Technology and Science (BITS), Pilani',
          degree: 'B.E. in Electrical Engineering & Minor in Finance',
          period: '2016 – 2020',
          gpa: '8.45 / 10.0 CGPA'
        }
      ],
      skills: [
        'Product Strategy', 'User Discovery', 'A/B Testing & Experimentation',
        'Wireframing & Prototyping', 'Product Analytics (Amplitude, Mixpanel)',
        'Roadmapping (Jira, Linear)', 'SQL & Data Querying', 'Figma',
        'Product-Led Growth (PLG)', 'Go-To-Market (GTM)', 'PRD Writing'
      ],
      skillCategories: {
        'Product Strategy': 'Strategy & Discovery',
        'User Discovery': 'Strategy & Discovery',
        'Product-Led Growth (PLG)': 'Strategy & Discovery',
        'Go-To-Market (GTM)': 'Strategy & Discovery',
        'A/B Testing & Experimentation': 'Analytics & Execution',
        'Product Analytics (Amplitude, Mixpanel)': 'Analytics & Execution',
        'SQL & Data Querying': 'Analytics & Execution',
        'Wireframing & Prototyping': 'Design & Tooling',
        'Figma': 'Design & Tooling',
        'Roadmapping (Jira, Linear)': 'Design & Tooling',
        'PRD Writing': 'Design & Tooling'
      },
      projects: [
        {
          id: 301,
          name: 'SaaS Retention Framework Playbook',
          desc: 'Authored an open-source retention diagnosis framework downloaded by 4,500+ product operators, providing cohort analysis formulas and onboarding milestone benchmarks.',
          link: 'rohanverma.co/retention-playbook'
        }
      ],
      certifications: [
        { id: 401, name: 'Reforge – Product Strategy & Growth Series', year: '2023' }
      ]
    }
  },
  {
    id: 'data_scientist',
    title: 'Data Scientist / Analytics (SQL / Python / Tableau)',
    roleCategory: 'Data & Analytics',
    tag: 'Data Science / BI',
    data: {
      personal: {
        name: 'Neha Kapoor',
        title: 'Data Scientist & Analytics Specialist',
        email: 'neha.kapoor.data@gmail.com',
        phone: '+91 97654 32109',
        location: 'Delhi NCR, India',
        linkedin: 'linkedin.com/in/neha-kapoor-data',
        website: 'github.com/nehakapoor-ds',
        photo: ''
      },
      summary: 'Data Scientist with 3+ years experience leveraging statistical modeling, predictive analytics, and executive BI dashboards to solve complex supply chain and revenue optimization problems. Expert in advanced SQL, Python, Snowflake, and Tableau.',
      experience: [
        {
          id: 101,
          company: 'Delhivery',
          role: 'Data Scientist II',
          period: 'Aug 2022 – Present',
          location: 'Gurugram, India',
          bullets: [
            'Built automated route optimization algorithm analyzing historical delivery telemetry across 18,000+ pin codes, decreasing fuel costs by 14% ($2.1M annual savings).',
            'Engineered dynamic delivery ETA prediction model deployed via FastAPI, improving on-time promise accuracy from 81% to 94.6%.',
            'Designed executive Tableau dashboards tracking package sorting throughput across 24 regional hub hubs, adopted daily by VP of Operations.'
          ]
        },
        {
          id: 102,
          company: 'Mu Sigma Inc.',
          role: 'Data Analyst',
          period: 'Jul 2020 – Jul 2022',
          location: 'Bengaluru, India',
          bullets: [
            'Analyzed consumer purchase behavior for a Fortune 500 US retail chain, discovering product cross-sell affinities that lifted average basket size by 7.8%.',
            'Wrote automated SQL pipelines over 500GB+ daily sales data in Snowflake, reducing dashboard refresh latency from 3 hours to 18 minutes.'
          ]
        }
      ],
      education: [
        {
          id: 201,
          school: 'Delhi Technological University (DTU)',
          degree: 'B.Tech in Mathematics and Computing',
          period: '2016 – 2020',
          gpa: '8.62 / 10.0 CGPA'
        }
      ],
      skills: [
        'Python', 'Advanced SQL', 'Pandas', 'NumPy', 'Scikit-Learn',
        'Tableau', 'Power BI', 'Snowflake', 'BigQuery', 'A/B Testing',
        'Statistical Modeling', 'FastAPI', 'Git', 'dbt'
      ],
      skillCategories: {
        'Python': 'Programming',
        'Advanced SQL': 'Programming',
        'Git': 'Programming',
        'Pandas': 'Analysis & Modeling',
        'NumPy': 'Analysis & Modeling',
        'Scikit-Learn': 'Analysis & Modeling',
        'Statistical Modeling': 'Analysis & Modeling',
        'A/B Testing': 'Analysis & Modeling',
        'Tableau': 'Visualization & Warehousing',
        'Power BI': 'Visualization & Warehousing',
        'Snowflake': 'Visualization & Warehousing',
        'BigQuery': 'Visualization & Warehousing',
        'dbt': 'Visualization & Warehousing',
        'FastAPI': 'Visualization & Warehousing'
      },
      projects: [
        {
          id: 301,
          name: 'RetailSales Predictor — Time-Series Forecasting',
          desc: 'Implemented Prophet and SARIMAX time-series forecasting model for multi-store inventory demand planning with 92.4% MAPE accuracy across 45 SKU categories.',
          link: 'github.com/nehakapoor-ds/retailsales-predictor'
        }
      ],
      certifications: [
        { id: 401, name: 'Tableau Desktop Certified Specialist', year: '2022' }
      ]
    }
  },
  {
    id: 'fresher_student',
    title: 'New Graduate / Fresher (B.Tech CSE / AI & ML)',
    roleCategory: 'College Graduate',
    tag: 'Entry-Level / 2025-2026 Grad',
    data: {
      personal: {
        name: 'Hritik Kumar',
        title: 'Software Engineering Graduate (B.Tech CSE)',
        email: 'hritikkumar.dev@gmail.com',
        phone: '+91 95460 76686',
        location: 'Kolkata, India',
        linkedin: 'linkedin.com/in/hritikkumar',
        website: 'github.com/hritikkumarpd',
        photo: ''
      },
      summary: 'Proactive Computer Science graduate specializing in AI, Machine Learning, and Full-Stack Web Development. Proven track record building end-to-end applications, open-source projects, and leading college hackathon teams. Seeking a software engineering or AI role to build scalable user-centric software.',
      experience: [
        {
          id: 101,
          company: 'TechCorp Solutions',
          role: 'Software Development Intern',
          period: 'May 2024 – Jul 2024',
          location: 'Kolkata, India',
          bullets: [
            'Built responsive client onboarding portal using React.js and TailwindCSS, cutting user onboarding drop-off by 25%.',
            'Engineered RESTful API endpoints with Node.js and Express to securely process document uploads and user profile updates.',
            'Collaborated with senior software architects in weekly code reviews and implemented automated CI tests using GitHub Actions.'
          ]
        }
      ],
      education: [
        {
          id: 201,
          school: 'Techno Main Salt Lake (TMSL)',
          degree: 'B.Tech in Computer Science and Engineering (AI & ML)',
          period: '2022 – 2026',
          gpa: '8.4 / 10.0 CGPA'
        },
        {
          id: 202,
          school: 'Delhi Public School',
          degree: 'Higher Secondary Certificate (CBSE Class XII) – Science',
          period: '2020 – 2022',
          gpa: '92.4%'
        }
      ],
      skills: [
        'C++', 'Java', 'Python', 'JavaScript', 'React.js',
        'Node.js', 'Express.js', 'HTML5/CSS3', 'TailwindCSS',
        'MongoDB', 'MySQL', 'Git & GitHub', 'REST APIs', 'Postman'
      ],
      skillCategories: {
        'C++': 'Programming Languages',
        'Java': 'Programming Languages',
        'Python': 'Programming Languages',
        'JavaScript': 'Programming Languages',
        'React.js': 'Web Development',
        'Node.js': 'Web Development',
        'Express.js': 'Web Development',
        'HTML5/CSS3': 'Web Development',
        'TailwindCSS': 'Web Development',
        'MongoDB': 'Databases & Tools',
        'MySQL': 'Databases & Tools',
        'Git & GitHub': 'Databases & Tools',
        'REST APIs': 'Databases & Tools',
        'Postman': 'Databases & Tools'
      },
      projects: [
        {
          id: 301,
          name: 'ResumeAI Pro — AI Resume Builder & ATS Scorer',
          desc: 'Architected full-stack resume platform featuring real-time AI content enhancement, ATS score calculation, direct vector PDF generation, and Supabase cloud persistence. Adopted by 1,200+ active students.',
          link: 'github.com/hritikkumarpd/resumeai-pro'
        },
        {
          id: 302,
          name: 'CampusMart — Student Marketplace Platform',
          desc: 'Built peer-to-peer campus marketplace for college textbooks and electronics with secure JWT authentication and real-time chat via Socket.io. Over 400 verified student signups.',
          link: 'github.com/hritikkumarpd/campusmart'
        }
      ],
      certifications: [
        { id: 401, name: 'HackerRank Problem Solving (Intermediate) Certificate', year: '2024' },
        { id: 402, name: 'Google Cloud Computing Foundations Certificate', year: '2023' }
      ]
    }
  }
]
