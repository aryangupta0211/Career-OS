export interface SkillDefinition {
  name: string
  category: string
  aliases?: string[]
  description?: string
  preparationTopics?: string[]
}

export const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frontend',
  'Backend',
  'Databases',
  'DevOps & Cloud',
  'AI & Machine Learning',
  'Data Engineering',
  'Developer Tools',
  'Software Engineering Concepts',
  'Soft Skills',
] as const

export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export const SKILL_DICTIONARY: SkillDefinition[] = [
  // --- Programming Languages ---
  {
    name: 'JavaScript',
    category: 'Programming Languages',
    aliases: ['js', 'es6', 'es2020', 'vanilla js', 'ecmascript'],
    preparationTopics: ['Event loop & asynchronous JS', 'Closures & Scope', 'Prototypes & Inheritance', 'Promises & Async/Await', 'DOM Manipulation'],
  },
  {
    name: 'TypeScript',
    category: 'Programming Languages',
    aliases: ['ts'],
    preparationTopics: ['Generics & Utility types', 'Type narrowing & discrimination', 'Interfaces vs Type aliases', 'TSConfig & module resolution', 'Strict mode type safety'],
  },
  {
    name: 'Python',
    category: 'Programming Languages',
    aliases: ['py', 'python3'],
    preparationTopics: ['Decorators & Generators', 'Data structures (lists, dicts, sets)', 'Memory management & GIL', 'Object-oriented Python', 'Concurrency & asyncio'],
  },
  {
    name: 'Java',
    category: 'Programming Languages',
    aliases: ['core java', 'java 17', 'java 21', 'java 11', 'java 8'],
    preparationTopics: ['OOP & Class design', 'Java Collections Framework', 'JVM internals & Memory model', 'Multithreading & Concurrency', 'Streams & Lambdas'],
  },
  {
    name: 'C++',
    category: 'Programming Languages',
    aliases: ['cpp', 'c plus plus', 'modern c++'],
    preparationTopics: ['Pointers & Smart pointers', 'RAII & Resource management', 'STL Containers & Algorithms', 'Templates & Generic programming', 'Move semantics & Memory model'],
  },
  {
    name: 'C#',
    category: 'Programming Languages',
    aliases: ['csharp', '.net c#'],
    preparationTopics: ['LINQ & Lambdas', 'Async/Await & Task Parallel Library', 'Memory management & Garbage collection', 'Delegates & Events', 'Dependency Injection in .NET'],
  },
  {
    name: 'Go',
    category: 'Programming Languages',
    aliases: ['golang'],
    preparationTopics: ['Goroutines & Channels', 'Interfaces & Struct composition', 'Pointers & Memory layout', 'Error handling patterns', 'Context & Concurrency synchronization'],
  },
  {
    name: 'Rust',
    category: 'Programming Languages',
    aliases: ['rustlang'],
    preparationTopics: ['Ownership & Borrow checker', 'Lifetimes', 'Traits & Generics', 'Concurrency without data races', 'Error handling with Result & Option'],
  },
  {
    name: 'SQL',
    category: 'Programming Languages',
    aliases: ['structured query language', 'ansi sql'],
    preparationTopics: ['Complex Joins & Subqueries', 'Aggregation & Grouping', 'Window functions', 'Query optimization & EXPLAIN', 'Transactions & ACID properties'],
  },
  {
    name: 'C',
    category: 'Programming Languages',
    aliases: ['c language', 'ansi c'],
    preparationTopics: ['Pointers & Memory allocation', 'Structures & Unions', 'Bitwise operations', 'File I/O and System calls', 'Preprocessor & Macros'],
  },
  {
    name: 'PHP',
    category: 'Programming Languages',
    aliases: ['php7', 'php8'],
    preparationTopics: ['OOP in PHP', 'Composer & Autoloading', 'PDO & Database queries', 'Session management & Security', 'Modern PHP 8+ features'],
  },
  {
    name: 'Ruby',
    category: 'Programming Languages',
    aliases: ['ruby on rails lang'],
    preparationTopics: ['Blocks, Procs & Lambdas', 'Metaprogramming', 'Mixins & Modules', 'Ruby OOP', 'Garbage collection & Gem management'],
  },
  {
    name: 'Swift',
    category: 'Programming Languages',
    aliases: ['swiftlang'],
    preparationTopics: ['Optionals & Unwrapping', 'Structs vs Classes', 'ARC & Memory management', 'Protocols & Extensions', 'Concurrency & Swift Async'],
  },
  {
    name: 'Kotlin',
    category: 'Programming Languages',
    aliases: ['kotlinlang'],
    preparationTopics: ['Null safety & Optionals', 'Coroutines', 'Extension functions', 'Data classes & Sealed classes', 'Java interoperability'],
  },
  {
    name: 'R',
    category: 'Programming Languages',
    aliases: ['r language', 'r programming'],
    preparationTopics: ['Data frames & Vectors', 'tidyverse & dplyr', 'ggplot2 visualization', 'Statistical hypothesis testing', 'Functional programming in R'],
  },
  {
    name: 'Scala',
    category: 'Programming Languages',
    aliases: ['scala lang'],
    preparationTopics: ['Functional programming patterns', 'Immutability & Pattern matching', 'Actors & Akka', 'Type system & Implicits', 'Spark with Scala'],
  },
  {
    name: 'Bash',
    category: 'Programming Languages',
    aliases: ['shell script', 'shell scripting', 'sh', 'zsh'],
    preparationTopics: ['Pipes & Redirection', 'Conditionals & Loops', 'Grep, Sed, Awk', 'Environment variables & Exit codes', 'Process management'],
  },

  // --- Frontend ---
  {
    name: 'React',
    category: 'Frontend',
    aliases: ['reactjs', 'react.js', 'react native'],
    preparationTopics: ['Component lifecycle & Virtual DOM', 'Hooks (useState, useEffect, useMemo, useCallback)', 'Custom hooks design', 'State management (Redux, Zustand, Context)', 'Performance optimization (memo, virtualization)'],
  },
  {
    name: 'Next.js',
    category: 'Frontend',
    aliases: ['nextjs', 'next'],
    preparationTopics: ['Server Components & Client Components', 'App Router vs Pages Router', 'SSR, SSG, and ISR rendering strategies', 'API Routes & Server Actions', 'SEO & Performance optimization'],
  },
  {
    name: 'Vue.js',
    category: 'Frontend',
    aliases: ['vue', 'vuejs', 'vue 3'],
    preparationTopics: ['Reactivity system (Ref, Reactive)', 'Composition API vs Options API', 'Pinia & Vuex state management', 'Vue Router', 'Directives & Custom Components'],
  },
  {
    name: 'Angular',
    category: 'Frontend',
    aliases: ['angularjs', 'angular 2+', 'ng'],
    preparationTopics: ['Dependency Injection & Services', 'RxJS Observables & Signals', 'Component architecture & Data binding', 'Directives & Pipes', 'Routing & Guards'],
  },
  {
    name: 'Svelte',
    category: 'Frontend',
    aliases: ['sveltekit'],
    preparationTopics: ['Compile-time reactivity', 'Stores & Reactive declarations', 'Component props & Slots', 'SvelteKit routing', 'Animations & Transitions'],
  },
  {
    name: 'HTML5',
    category: 'Frontend',
    aliases: ['html', 'semantic html'],
    preparationTopics: ['Semantic tags & Accessibility (a11y)', 'Forms & Validation', 'Web storage & Cookies', 'SEO best practices', 'Canvas & SVG'],
  },
  {
    name: 'CSS3',
    category: 'Frontend',
    aliases: ['css', 'cascading style sheets'],
    preparationTopics: ['Flexbox & Grid layouts', 'Box model & Specificity', 'Responsive design & Media queries', 'Transitions & Keyframe animations', 'CSS variables & Architecture'],
  },
  {
    name: 'Tailwind CSS',
    category: 'Frontend',
    aliases: ['tailwind', 'tailwindcss'],
    preparationTopics: ['Utility-first workflow', 'Responsive breakpoints', 'Component extraction & @apply', 'Dark mode configuration', 'Custom theme configuration'],
  },
  {
    name: 'Redux',
    category: 'Frontend',
    aliases: ['redux toolkit', 'rtk'],
    preparationTopics: ['Single source of truth', 'Reducers, Actions & Store', 'Redux Toolkit (RTK) slices', 'Middleware & Thunks', 'RTK Query data fetching'],
  },
  {
    name: 'GraphQL',
    category: 'Frontend',
    aliases: ['gql', 'apollo client', 'relay'],
    preparationTopics: ['Queries, Mutations & Subscriptions', 'Schema definition & Types', 'Resolvers & N+1 query problem', 'Apollo Client caching', 'Federation & Microservices'],
  },
  {
    name: 'Vite',
    category: 'Frontend',
    aliases: ['vitejs'],
    preparationTopics: ['ESM-based HMR', 'Vite configuration & Plugins', 'Build optimization & Code splitting', 'Asset handling', 'SSR with Vite'],
  },
  {
    name: 'Webpack',
    category: 'Frontend',
    aliases: ['webpack 5'],
    preparationTopics: ['Entry, Output, Loaders, Plugins', 'Bundle analysis & Tree-shaking', 'Code splitting & Dynamic imports', 'Source maps & Minification', 'Webpack dev server'],
  },

  // --- Backend ---
  {
    name: 'Node.js',
    category: 'Backend',
    aliases: ['node', 'nodejs'],
    preparationTopics: ['Event loop & Non-blocking I/O', 'Streams & Buffers', 'Clustering & Child processes', 'Native modules & EventEmitters', 'Memory leaks & Profiling'],
  },
  {
    name: 'Express',
    category: 'Backend',
    aliases: ['express.js', 'expressjs'],
    preparationTopics: ['Middleware architecture', 'Routing & Route parameters', 'Error handling middleware', 'Authentication & Session management', 'Security best practices (Helmet, CORS, Rate limiting)'],
  },
  {
    name: 'NestJS',
    category: 'Backend',
    aliases: ['nest.js', 'nestjs'],
    preparationTopics: ['Dependency Injection & Modules', 'Controllers & Services', 'Pipes, Guards & Interceptors', 'TypeORM / Prisma integration', 'Microservices in NestJS'],
  },
  {
    name: 'Spring Boot',
    category: 'Backend',
    aliases: ['spring', 'spring framework', 'spring mvc', 'spring cloud'],
    preparationTopics: ['Inversion of Control (IoC) & DI', 'Spring Boot Autoconfiguration', 'Spring Data JPA & Hibernate', 'Spring Security & OAuth2', 'RESTful API design with Spring'],
  },
  {
    name: 'Django',
    category: 'Backend',
    aliases: ['django rest framework', 'drf'],
    preparationTopics: ['MVT Architecture', 'Django ORM & QuerySets', 'DRF Serializers & ViewSets', 'Authentication & Permissions', 'Django Migrations & Admin'],
  },
  {
    name: 'FastAPI',
    category: 'Backend',
    aliases: ['fast api'],
    preparationTopics: ['Pydantic data validation', 'Asynchronous endpoints (async/await)', 'Dependency Injection system', 'Automatic OpenAPI documentation', 'Background tasks & WebSockets'],
  },
  {
    name: 'Flask',
    category: 'Backend',
    aliases: ['flask app'],
    preparationTopics: ['Application factory & Blueprints', 'SQLAlchemy integration', 'Routing & Request context', 'Session & Cookie security', 'Flask-RESTful & Marshmallow'],
  },
  {
    name: 'ASP.NET Core',
    category: 'Backend',
    aliases: ['aspnet', 'asp.net', '.net core', 'dotnet core'],
    preparationTopics: ['Middleware pipeline', 'Dependency injection container', 'Entity Framework Core', 'Authentication & JWT Bearer', 'Minimal APIs vs Controller-based'],
  },
  {
    name: 'REST APIs',
    category: 'Backend',
    aliases: ['restful api', 'rest', 'restful'],
    preparationTopics: ['HTTP methods & Idempotency', 'Status codes & Error structures', 'Pagination, Filtering & Sorting', 'Versioning strategies', 'API Security (CORS, Rate Limiting, Authentication)'],
  },
  {
    name: 'gRPC',
    category: 'Backend',
    aliases: ['protocol buffers', 'protobuf'],
    preparationTopics: ['Protocol Buffers definition', 'Unary vs Streaming RPCs', 'HTTP/2 multiplexing benefits', 'Client generation & Interceptors', 'gRPC vs REST comparisons'],
  },
  {
    name: 'Microservices',
    category: 'Backend',
    aliases: ['microservice architecture', 'distributed services'],
    preparationTopics: ['Service boundaries & Domain-Driven Design', 'Inter-service communication (Sync vs Async)', 'API Gateway pattern', 'Distributed Tracing & Observability', 'Resilience patterns (Circuit breaker, Retry, Bulkhead)'],
  },
  {
    name: 'Kafka',
    category: 'Backend',
    aliases: ['apache kafka'],
    preparationTopics: ['Topics, Partitions & Offsets', 'Consumer groups & Rebalancing', 'Producer delivery guarantees (acks)', 'Log compaction & Retention', 'Kafka Streams vs Connect'],
  },
  {
    name: 'RabbitMQ',
    category: 'Backend',
    aliases: ['rabbitmq message broker'],
    preparationTopics: ['Exchanges, Queues & Bindings', 'Exchange types (Direct, Fanout, Topic)', 'Message acknowledgments & DLX', 'Prefetch count & QoS', 'Clustering & High availability'],
  },

  // --- Databases ---
  {
    name: 'PostgreSQL',
    category: 'Databases',
    aliases: ['postgres', 'pgsql', 'postgresql db'],
    preparationTopics: ['B-Tree, GIN, GiST Indexing', 'EXPLAIN ANALYZE & Query planning', 'Transactions, Locks & MVCC', 'JSONB data types & indexing', 'Partitioning & Replication'],
  },
  {
    name: 'MySQL',
    category: 'Databases',
    aliases: ['mysql db', 'mariadb'],
    preparationTopics: ['InnoDB storage engine & Buffer pool', 'Indexing best practices', 'Replication (Master-Slave, Multi-Master)', 'Slow query log analysis', 'ACID transactions & Isolation levels'],
  },
  {
    name: 'MongoDB',
    category: 'Databases',
    aliases: ['mongo', 'mongodb database'],
    preparationTopics: ['Document modeling & Embedding vs Referencing', 'Aggregation pipeline', 'Compound & Multikey Indexes', 'Replica sets & Election process', 'Sharding & Horizontal scaling'],
  },
  {
    name: 'Redis',
    category: 'Databases',
    aliases: ['redis cache'],
    preparationTopics: ['Data structures (Strings, Hashes, Lists, Sets, Sorted Sets)', 'Caching strategies (Cache-Aside, Write-Through)', 'Eviction policies (LRU, LFU)', 'Pub/Sub & Streams', 'Persistence (RDB vs AOF)'],
  },
  {
    name: 'Prisma',
    category: 'Databases',
    aliases: ['prisma orm', 'prisma client'],
    preparationTopics: ['Prisma Schema modeling & Relations', 'Query optimization & Includes/Selects', 'Migrations workflow & Deployment', 'Transactions & Middleware', 'Prisma Client type safety'],
  },
  {
    name: 'Elasticsearch',
    category: 'Databases',
    aliases: ['elastic search', 'es', 'opensearch'],
    preparationTopics: ['Inverted index fundamentals', 'Analyzers, Tokenizers & Stemming', 'Match vs Term queries', 'Aggregations & Filter context', 'Sharding, Routing & Cluster health'],
  },
  {
    name: 'DynamoDB',
    category: 'Databases',
    aliases: ['amazon dynamodb'],
    preparationTopics: ['Partition key vs Sort key design', 'Global Secondary Indexes (GSI) vs LSI', 'Single-table design principles', 'Query vs Scan operations', 'Read/Write capacity units & Autoscaling'],
  },
  {
    name: 'SQLite',
    category: 'Databases',
    aliases: ['sqlite3'],
    preparationTopics: ['File-based database mechanics', 'WAL mode (Write-Ahead Logging)', 'Transactions & Locking mechanisms', 'Embedded database best practices', 'Indexes in SQLite'],
  },

  // --- DevOps & Cloud ---
  {
    name: 'Docker',
    category: 'DevOps & Cloud',
    aliases: ['dockerfile', 'docker container', 'docker compose'],
    preparationTopics: ['Dockerfile multi-stage builds', 'Image optimization & Layer caching', 'Containers vs Virtual Machines', 'Networking & Volumes in Docker', 'Docker Compose multi-service setup'],
  },
  {
    name: 'Kubernetes',
    category: 'DevOps & Cloud',
    aliases: ['k8s', 'kube', 'k3s'],
    preparationTopics: ['Pods, Deployments & ReplicaSets', 'Services (ClusterIP, NodePort, LoadBalancer)', 'Ingress controllers & Routing', 'ConfigMaps & Secrets management', 'Health checks (Liveness, Readiness, Startup)'],
  },
  {
    name: 'AWS',
    category: 'DevOps & Cloud',
    aliases: ['amazon web services', 'aws cloud'],
    preparationTopics: ['Compute (EC2, ECS, EKS, Lambda)', 'Storage (S3, EBS, EFS)', 'Networking (VPC, Subnets, Route53, CloudFront)', 'IAM roles & Least privilege policies', 'Monitoring with CloudWatch'],
  },
  {
    name: 'Google Cloud',
    category: 'DevOps & Cloud',
    aliases: ['gcp', 'google cloud platform'],
    preparationTopics: ['Compute Engine & Cloud Run', 'GKE (Google Kubernetes Engine)', 'Cloud Storage & IAM', 'BigQuery & Pub/Sub', 'VPC & Cloud Armor'],
  },
  {
    name: 'Microsoft Azure',
    category: 'DevOps & Cloud',
    aliases: ['azure', 'azure cloud'],
    preparationTopics: ['Azure App Service & Functions', 'AKS (Azure Kubernetes Service)', 'Blob Storage & Virtual Networks', 'Azure Active Directory (Entra ID)', 'Azure DevOps pipelines'],
  },
  {
    name: 'CI/CD',
    category: 'DevOps & Cloud',
    aliases: ['continuous integration', 'continuous deployment', 'cicd'],
    preparationTopics: ['Pipeline stages (Lint, Test, Build, Deploy)', 'Automated testing integration', 'Deployment strategies (Blue-Green, Canary, Rolling)', 'Secret management in pipelines', 'Artifact storage & Versioning'],
  },
  {
    name: 'GitHub Actions',
    category: 'DevOps & Cloud',
    aliases: ['github action', 'gh actions'],
    preparationTopics: ['Workflow syntax & Triggers', 'Jobs, Steps & Matrix builds', 'Composite & Custom Actions', 'Secrets & Environment variables', 'Caching dependencies'],
  },
  {
    name: 'Terraform',
    category: 'DevOps & Cloud',
    aliases: ['tf', 'iac', 'infrastructure as code'],
    preparationTopics: ['HCL syntax & Resource blocks', 'State management & Remote backends', 'Variables, Outputs & Locals', 'Modules & Reusable architecture', 'Plan, Apply & Drift detection'],
  },
  {
    name: 'Linux',
    category: 'DevOps & Cloud',
    aliases: ['unix', 'ubuntu', 'centos', 'debian'],
    preparationTopics: ['File permissions & Users (chmod, chown)', 'Process management (ps, top, kill, systemd)', 'Network diagnostics (netstat, curl, ss, dig)', 'Disk space & logs (df, du, journalctl)', 'SSH keys & Security hardening'],
  },

  // --- AI & Machine Learning ---
  {
    name: 'Machine Learning',
    category: 'AI & Machine Learning',
    aliases: ['ml', 'machine learning algorithms'],
    preparationTopics: ['Supervised vs Unsupervised learning', 'Bias-Variance tradeoff', 'Cross-validation & Overfitting', 'Evaluation metrics (Precision, Recall, F1, ROC-AUC)', 'Feature engineering & Normalization'],
  },
  {
    name: 'Deep Learning',
    category: 'AI & Machine Learning',
    aliases: ['neural networks', 'dl'],
    preparationTopics: ['Backpropagation & Gradient Descent', 'Activation functions (ReLU, Sigmoid, Softmax)', 'CNNs for Computer Vision', 'RNNs, LSTMs & Transformers', 'Regularization (Dropout, Batch Normalization)'],
  },
  {
    name: 'PyTorch',
    category: 'AI & Machine Learning',
    aliases: ['torch'],
    preparationTopics: ['Tensors & Autograd mechanics', 'nn.Module & Custom Layers', 'Dataset & DataLoader', 'Training loop & Optimizers', 'Model saving & GPU acceleration'],
  },
  {
    name: 'TensorFlow',
    category: 'AI & Machine Learning',
    aliases: ['tf keras', 'keras'],
    preparationTopics: ['Sequential vs Functional API', 'Model compilation & Callbacks', 'Data pipelines with tf.data', 'TensorBoard visualization', 'TF Serving & Model deployment'],
  },
  {
    name: 'NLP',
    category: 'AI & Machine Learning',
    aliases: ['natural language processing', 'text processing'],
    preparationTopics: ['Tokenization & Lemmatization', 'TF-IDF & Word Embeddings', 'Transformer architecture & Attention mechanism', 'Named Entity Recognition (NER)', 'Sentiment Analysis & Classification'],
  },
  {
    name: 'LLM',
    category: 'AI & Machine Learning',
    aliases: ['large language models', 'genai', 'generative ai', 'gpt'],
    preparationTopics: ['Prompt engineering & Few-shot learning', 'Retrieval-Augmented Generation (RAG)', 'Embeddings & Vector Databases', 'Fine-tuning vs In-Context Learning', 'Evaluation & Hallucination mitigation'],
  },
  {
    name: 'Pandas',
    category: 'AI & Machine Learning',
    aliases: ['pandas library'],
    preparationTopics: ['DataFrames & Series manipulation', 'Handling missing data', 'GroupBy & Aggregations', 'Merging, Joining & Concatenating', 'Time series analysis'],
  },

  // --- Developer Tools ---
  {
    name: 'Git',
    category: 'Developer Tools',
    aliases: ['git version control'],
    preparationTopics: ['Branching strategies (GitFlow, Trunk-based)', 'Rebase vs Merge', 'Interactive rebasing & Squashing', 'Resolving merge conflicts', 'Cherry-pick, Stash & Reflog'],
  },
  {
    name: 'Jest',
    category: 'Developer Tools',
    aliases: ['jest testing'],
    preparationTopics: ['Unit testing syntax (describe, test, expect)', 'Mocking modules & Functions', 'Snapshot testing', 'Asynchronous testing', 'Test coverage reports'],
  },
  {
    name: 'Vitest',
    category: 'Developer Tools',
    aliases: ['vitest runner'],
    preparationTopics: ['Vite native test runner', 'Mocking & Spying', 'Concurrent test execution', 'Snapshot & In-source testing', 'Environment configuration (node/jsdom)'],
  },
  {
    name: 'Postman',
    category: 'Developer Tools',
    aliases: ['postman api'],
    preparationTopics: ['API request collections', 'Environment variables & Secrets', 'Automated test scripts in Postman', 'Mock servers & Documentation', 'Newman CLI integration'],
  },

  // --- Software Engineering Concepts ---
  {
    name: 'Data Structures and Algorithms',
    category: 'Software Engineering Concepts',
    aliases: ['dsa', 'data structures', 'algorithms'],
    preparationTopics: ['Arrays & Two-pointer / Sliding Window', 'Hash Maps & Sets for O(1) lookups', 'Linked Lists, Stacks & Queues', 'Trees & Binary Search Trees (DFS/BFS)', 'Graphs, Dynamic Programming & Big-O notation'],
  },
  {
    name: 'System Design',
    category: 'Software Engineering Concepts',
    aliases: ['distributed systems design', 'high level design', 'hld'],
    preparationTopics: ['Scalability (Horizontal vs Vertical)', 'Load Balancers & Reverse Proxies', 'Database Sharding & Replication', 'Caching layers & CDN', 'Message queues & Asynchronous processing'],
  },
  {
    name: 'Object-Oriented Programming',
    category: 'Software Engineering Concepts',
    aliases: ['oop', 'object oriented'],
    preparationTopics: ['Encapsulation & Abstraction', 'Inheritance & Polymorphism', 'SOLID Principles', 'Composition over Inheritance', 'Common Creational/Structural/Behavioral Design Patterns'],
  },
  {
    name: 'Unit Testing',
    category: 'Software Engineering Concepts',
    aliases: ['automated testing', 'tdd', 'test driven development'],
    preparationTopics: ['Writing testable modular code', 'Test-Driven Development (TDD) cycle', 'Mocks, Stubs & Spies', 'Edge cases & Boundary testing', 'Code coverage metrics & meaningful assertions'],
  },

  // --- Soft Skills ---
  {
    name: 'Communication',
    category: 'Soft Skills',
    aliases: ['effective communication', 'verbal communication', 'written communication'],
    preparationTopics: ['Technical communication to non-technical stakeholders', 'Clear documentation & PR descriptions', 'Active listening in team discussions', 'Constructive code review feedback', 'Presenting architectural decisions'],
  },
  {
    name: 'Leadership',
    category: 'Soft Skills',
    aliases: ['team leadership', 'tech lead', 'mentorship'],
    preparationTopics: ['Guiding technical direction', 'Mentoring junior and mid-level engineers', 'Facilitating sprint retrospectives', 'Conflict resolution in engineering teams', 'Ownership of end-to-end deliverables'],
  },
  {
    name: 'Problem Solving',
    category: 'Soft Skills',
    aliases: ['analytical skills', 'troubleshooting'],
    preparationTopics: ['Root cause analysis (5 Whys)', 'Debugging production incidents under pressure', 'Tradeoff evaluation (Build vs Buy, Speed vs Quality)', 'Breaking complex problems into milestones', 'Hypothesis-driven debugging'],
  },
  {
    name: 'Teamwork',
    category: 'Soft Skills',
    aliases: ['collaboration', 'cross-functional collaboration'],
    preparationTopics: ['Pair programming best practices', 'Cross-functional work with Product & Design', 'Empathy & Psychological safety', 'Asynchronous team collaboration', 'Managing shared responsibilities'],
  },
  {
    name: 'Agile & Scrum',
    category: 'Soft Skills',
    aliases: ['agile', 'scrum', 'kanban', 'sprint planning'],
    preparationTopics: ['Sprint lifecycle & Ceremonies', 'Story estimation & Velocity', 'Backlog grooming & Acceptance criteria', 'Iterative delivery & MVP mindset', 'Continuous improvement via Retrospectives'],
  },
]

