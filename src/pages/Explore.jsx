import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import "./Explore.css";

function Explore() {
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [openTopic, setOpenTopic] = useState(null);
  const [completedSubtopics, setCompletedSubtopics] = useState({});
  const [courses, setCourses] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [canTrackProgress, setCanTrackProgress] = useState(false);
  const activeCourse = courses.find((course) => course.id === activeCourseId);
  const topics = activeCourse?.topics ?? [];
  const activeTitle = activeCourse?.title ?? "Courses";
  const toId = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  useEffect(() => {
    let isMounted = true;
    const loadCourses = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [systemResponse, myResponse] = await Promise.all([
          fetch(apiUrl("/api/courses")),
          fetch(apiUrl("/api/my/courses")),
        ]);

        if (!systemResponse.ok) {
          throw new Error("Failed to load courses");
        }

        const systemData = await systemResponse.json();
        const myData = myResponse.ok ? await myResponse.json() : { courses: [] };
        if (!isMounted) {
          return;
        }

        const systemCourses = Array.isArray(systemData.courses)
          ? systemData.courses
          : [];
        const myCourses = Array.isArray(myData.courses) ? myData.courses : [];
        const nextCourses = [...systemCourses, ...myCourses];

        setCourses(nextCourses);
        if (nextCourses.length) {
          const hasActive = nextCourses.some(
            (course) => course.id === activeCourseId,
          );
          if (!hasActive) {
            setActiveCourseId(nextCourses[0].id);
          }
        }
      } catch (error) {
        if (isMounted) {
          setLoadError("Unable to load courses right now.");
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setOpenTopic(null);
  }, [activeCourseId]);

  useEffect(() => {
    let isMounted = true;
    const loadProgress = async () => {
      setProgressError("");
      try {
        const response = await fetch(apiUrl("/api/my/progress"));
        if (response.status === 401) {
          if (isMounted) {
            setCanTrackProgress(false);
          }
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load progress");
        }
        const data = await response.json();
        if (!isMounted) {
          return;
        }
        const progress = Array.isArray(data.progress) ? data.progress : [];
        const nextCompleted = {};
        progress.forEach((row) => {
          if (row.is_done) {
            nextCompleted[row.subtopic_id] = true;
          }
        });
        setCompletedSubtopics(nextCompleted);
        setCanTrackProgress(true);
      } catch (error) {
        if (isMounted) {
          setProgressError("Unable to load progress right now.");
        }
      }
    };

    loadProgress();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleSubtopic = async (subtopicId) => {
    if (!canTrackProgress) {
      setProgressError("Sign in to track progress.");
      return;
    }

    const currentValue = !!completedSubtopics[subtopicId];
    const nextValue = !currentValue;
    setCompletedSubtopics((current) => ({
      ...current,
      [subtopicId]: nextValue,
    }));

    try {
      const response = await fetch(apiUrl(`/api/my/progress/${subtopicId}`), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_done: nextValue }),
      });
      if (response.status === 401) {
        throw new Error("unauthorized");
      }
      if (!response.ok) {
        throw new Error("Failed to update");
      }
      setProgressError("");
    } catch (error) {
      setCompletedSubtopics((current) => ({
        ...current,
        [subtopicId]: currentValue,
      }));
      setProgressError("Unable to update progress right now.");
    }
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
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                className={`sidebar-link${activeCourseId === course.id ? " is-active" : ""}`}
                onClick={() => setActiveCourseId(course.id)}
              >
                {course.title}
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
          <h1>{activeTitle}</h1>
          <p className="explore-subhead">
            Curated tracks, resources, and projects to help you build depth in{" "}
            {activeTitle}.
          </p>
        </div>
        {isLoading && <p className="explore-subhead">Loading courses...</p>}
        {loadError && !isLoading && (
          <p className="explore-subhead">{loadError}</p>
        )}
        {progressError && !loadError && (
          <p className="explore-subhead">{progressError}</p>
        )}
        {!canTrackProgress && !loadError && !isLoading && (
          <div className="explore-subhead">
            <span>Sign in to track your progress. </span>
            <Link to="/edit-courses">Sign in</Link>
          </div>
        )}
        <section className="topic-table" aria-label={`${activeTitle} topics`}>
          <ul className="topic-list">
            {topics.map((topic) => (
              <li
                key={topic.id ?? topic.title}
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
                    {topic.description && (
                      <p className="topic-desc">{topic.description}</p>
                    )}
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
                          (subtopic) => !!completedSubtopics[subtopic.id],
                        ).length
                      }
                      /{topic.subtopics.length} done
                    </span>
                  </div>
                  <ul className="subtopic-list">
                    {topic.subtopics.map((subtopic) => (
                      <li
                        key={subtopic.id ?? subtopic.title}
                        className={`subtopic-item${
                          completedSubtopics[subtopic.id] ? " is-done" : ""
                        }`}
                      >
                        <label className="subtopic-label">
                          <input
                            type="checkbox"
                            className="subtopic-checkbox"
                            disabled={!canTrackProgress}
                            title={
                              canTrackProgress
                                ? ""
                                : "Sign in to track progress"
                            }
                            checked={!!completedSubtopics[subtopic.id]}
                            onChange={() => handleToggleSubtopic(subtopic.id)}
                          />
                          <span className="subtopic-text">
                            {subtopic.title ?? subtopic}
                          </span>
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
