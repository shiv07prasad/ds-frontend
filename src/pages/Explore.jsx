import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Explore.css";

function Explore() {
  const [activeSection, setActiveSection] = useState("Statistics");
  const [openTopic, setOpenTopic] = useState(null);
  const [completedSubtopics, setCompletedSubtopics] = useState({});
  const sections = [
    "Statistics",
    "Data Science",
    "Machine Learning",
    "AI",
    "Backend Engineering",
    "DSA",
  ];
  const topicsBySection = {
    Statistics: [
      {
        title: "What is Statistics?",
        description:
          "Understand the scope, key concepts, and real-world applications.",
        subtopics: [
          "Population vs sample",
          "Parameters and statistics",
          "Why uncertainty matters",
        ],
      },
      {
        title: "Descriptive vs Inferential Statistics",
        description: "Learn the difference and when to use each.",
        subtopics: [
          "Summaries and visualization",
          "Inference and confidence",
          "Common pitfalls",
        ],
      },
      {
        title: "Types of Data",
        description:
          "Explore numerical, categorical, discrete, and continuous data.",
        subtopics: [
          "Scales of measurement",
          "Data collection bias",
          "Encoding categories",
        ],
      },
      {
        title: "Key Terms and Notation",
        description:
          "Review essential terminology and symbols used in statistics.",
        subtopics: [
          "Mean, median, mode",
          "Variance and standard deviation",
          "Probability notation",
        ],
      },
      {
        title: "Branches of Statistics",
        description: "Dive into major branches and their use cases.",
        subtopics: [
          "Bayesian statistics",
          "Frequentist statistics",
          "Applied statistics",
        ],
      },
    ],
    "Data Science": [
      {
        title: "Data Science Overview",
        description:
          "Understand the workflow from problem framing to delivery.",
        subtopics: [
          "Problem definition",
          "Data acquisition",
          "Deployment and feedback",
        ],
      },
      {
        title: "Data Collection and Cleaning",
        description: "Learn how to gather, validate, and clean messy data.",
        subtopics: [
          "Missing data handling",
          "Outlier detection",
          "Data validation rules",
        ],
      },
      {
        title: "Exploratory Data Analysis",
        description: "Use summaries and visuals to uncover patterns.",
        subtopics: [
          "Univariate analysis",
          "Bivariate analysis",
          "Visualization best practices",
        ],
      },
      {
        title: "Experimentation Basics",
        description: "Design tests and measure impact with confidence.",
        subtopics: [
          "A/B testing",
          "Power and sample size",
          "Interpreting results",
        ],
      },
      {
        title: "Communication and Storytelling",
        description: "Turn analysis into narratives that drive action.",
        subtopics: [
          "Audience alignment",
          "Narrative structure",
          "Visual storytelling",
        ],
      },
    ],
    "Machine Learning": [
      {
        title: "ML Fundamentals",
        description:
          "Learn supervised, unsupervised, and reinforcement learning.",
        subtopics: ["Problem types", "Training vs inference", "Data leakage"],
      },
      {
        title: "Feature Engineering",
        description: "Transform raw data into model-ready signals.",
        subtopics: [
          "Scaling and normalization",
          "Encoding categories",
          "Feature selection",
        ],
      },
      {
        title: "Model Evaluation",
        description: "Use metrics and validation to avoid overfitting.",
        subtopics: [
          "Train/validation/test",
          "Cross-validation",
          "Precision and recall",
        ],
      },
      {
        title: "Algorithms Overview",
        description: "Compare trees, linear models, and neural networks.",
        subtopics: ["Linear models", "Tree-based methods", "Neural networks"],
      },
      {
        title: "Deployment Basics",
        description: "Ship models with monitoring and retraining plans.",
        subtopics: ["Model serving", "Monitoring drift", "Rollback strategies"],
      },
    ],
    AI: [
      {
        title: "AI Landscape",
        description: "Map the ecosystem: classical AI, ML, and GenAI.",
        subtopics: [
          "Symbolic vs statistical AI",
          "GenAI capabilities",
          "AI constraints",
        ],
      },
      {
        title: "Prompting and Evaluation",
        description: "Design prompts and evaluate model outputs.",
        subtopics: [
          "Prompt patterns",
          "Evaluation rubrics",
          "Failure analysis",
        ],
      },
      {
        title: "Responsible AI",
        description: "Bias, safety, and governance essentials.",
        subtopics: ["Bias mitigation", "Safety guardrails", "Policy alignment"],
      },
      {
        title: "AI System Design",
        description: "Compose tools, models, and data pipelines.",
        subtopics: ["Tool orchestration", "RAG patterns", "Latency trade-offs"],
      },
      {
        title: "AI Use Cases",
        description: "Identify high-impact applications across industries.",
        subtopics: [
          "Customer support",
          "Content generation",
          "Decision support",
        ],
      },
    ],
    "Backend Engineering": [
      {
        title: "API Design",
        description: "Design REST and GraphQL interfaces with stability.",
        subtopics: ["Versioning", "Idempotency", "Error modeling"],
      },
      {
        title: "Databases",
        description: "Choose SQL vs NoSQL and model data effectively.",
        subtopics: ["Schema design", "Indexing", "Transactions"],
      },
      {
        title: "Scalability Basics",
        description: "Learn caching, queues, and horizontal scaling.",
        subtopics: [
          "Caching strategies",
          "Queue-based workflows",
          "Load balancing",
        ],
      },
      {
        title: "Auth and Security",
        description: "Protect systems with authN/authZ best practices.",
        subtopics: ["JWT and sessions", "OAuth flows", "Least privilege"],
      },
      {
        title: "Observability",
        description: "Logs, metrics, and traces for reliable services.",
        subtopics: ["Structured logging", "SLIs and SLOs", "Tracing basics"],
      },
    ],
    DSA: [
      {
        title: "Core Data Structures",
        description: "Arrays, stacks, queues, linked lists, and trees.",
        subtopics: [
          "Time/space trade-offs",
          "When to use which",
          "Common pitfalls",
        ],
      },
      {
        title: "Sorting and Searching",
        description: "Time complexity and classic algorithm patterns.",
        subtopics: [
          "Sorting algorithms",
          "Binary search",
          "Complexity analysis",
        ],
      },
      {
        title: "Graphs",
        description: "Traversal, shortest paths, and connectivity.",
        subtopics: ["BFS and DFS", "Shortest path", "Union-Find"],
      },
      {
        title: "Dynamic Programming",
        description: "Break problems into overlapping subproblems.",
        subtopics: ["State definition", "Transitions", "Memoization"],
      },
      {
        title: "Interview Patterns",
        description: "Practice techniques used in real interviews.",
        subtopics: ["Two pointers", "Sliding window", "Backtracking"],
      },
    ],
  };
  const topics = topicsBySection[activeSection] ?? [];
  const toId = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  useEffect(() => {
    setOpenTopic(null);
  }, [activeSection]);

  const handleToggleSubtopic = (key) => {
    setCompletedSubtopics((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <div className="explore-page">
      <aside className="sidebar" aria-label="Explore navigation">
        <div className="sidebar-brand">
          <span className="brand-name">ALTITUDE</span>
          <span className="sidebar-tag">Explorer</span>
        </div>
        <div className="sidebar-main">
          <nav className="sidebar-nav">
            {sections.map((item) => (
              <button
                key={item}
                type="button"
                className={`sidebar-link${activeSection === item ? " is-active" : ""}`}
                onClick={() => setActiveSection(item)}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-actions">
          <Link to="/edit-courses" className="sidebar-edit">
            Edit Courses
          </Link>
          <Link to="/" className="sidebar-exit">
            Back to Home
          </Link>
        </div>
      </aside>

      <main className="explore-content">
        <div className="explore-header">
          <p className="explore-eyebrow">Learning Path</p>
          <h1>{activeSection}</h1>
          <p className="explore-subhead">
            Curated tracks, resources, and projects to help you build depth in{" "}
            {activeSection}.
          </p>
        </div>
        <section className="topic-table" aria-label={`${activeSection} topics`}>
          <ul className="topic-list">
            {topics.map((topic) => (
              <li
                key={topic.title}
                className={`topic-row${openTopic === topic.title ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="topic-trigger"
                  onClick={() =>
                    setOpenTopic((current) =>
                      current === topic.title ? null : topic.title,
                    )
                  }
                  aria-expanded={openTopic === topic.title}
                  aria-controls={`topic-${toId(topic.title)}`}
                >
                  <div className="topic-text">
                    <div className="topic-title">
                      <span className="topic-dot" aria-hidden="true" />
                      {topic.title}
                    </div>
                    <p className="topic-desc">{topic.description}</p>
                  </div>
                  <span className="topic-arrow" aria-hidden="true">
                    <svg
                      className="topic-arrow-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                <div
                  className="topic-panel"
                  id={`topic-${toId(topic.title)}`}
                  role="region"
                  aria-label={`${topic.title} subtopics`}
                >
                  <div className="subtopic-meta">
                    <span className="subtopic-meta-title">Subtopics</span>
                    <span className="subtopic-meta-progress">
                      {
                        topic.subtopics.filter(
                          (subtopic) =>
                            !!completedSubtopics[
                              `${activeSection}|${topic.title}|${subtopic}`
                            ],
                        ).length
                      }
                      /{topic.subtopics.length} done
                    </span>
                  </div>
                  <ul className="subtopic-list">
                    {topic.subtopics.map((subtopic) => (
                      <li
                        key={subtopic}
                        className={`subtopic-item${
                          completedSubtopics[
                            `${activeSection}|${topic.title}|${subtopic}`
                          ]
                            ? " is-done"
                            : ""
                        }`}
                      >
                        <label className="subtopic-label">
                          <input
                            type="checkbox"
                            className="subtopic-checkbox"
                            checked={
                              !!completedSubtopics[
                                `${activeSection}|${topic.title}|${subtopic}`
                              ]
                            }
                            onChange={() =>
                              handleToggleSubtopic(
                                `${activeSection}|${topic.title}|${subtopic}`,
                              )
                            }
                          />
                          <span className="subtopic-text">{subtopic}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default Explore;
