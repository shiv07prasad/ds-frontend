import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignedOut, useAuth } from "@clerk/clerk-react";
import { apiFetch } from "../lib/api";
import "./Explore.css";

function Explore() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [openTopics, setOpenTopics] = useState({});
  const [latestOpenTopic, setLatestOpenTopic] = useState(null);
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
  const getSubtopicTitle = (subtopic) =>
    typeof subtopic === "string" ? subtopic : subtopic?.title ?? "";
  const getSubtopicLink = (subtopic) =>
    typeof subtopic === "string" ? "" : subtopic?.link ?? "";
  const openSubtopicLink = (link) => {
    if (!link) {
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    let isMounted = true;
    if (!isLoaded) {
      return () => {
        isMounted = false;
      };
    }

    if (!isSignedIn) {
      setIsAdmin(false);
      return () => {
        isMounted = false;
      };
    }

    const loadMe = async () => {
      try {
        const response = await apiFetch("/api/me");
        if (!response.ok) {
          throw new Error("Failed to load user");
        }
        const data = await response.json();
        if (isMounted) {
          setIsAdmin(data.user?.is_admin === 1);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    };

    loadMe();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    let isMounted = true;
    if (!isLoaded) {
      return () => {
        isMounted = false;
      };
    }

    const loadCourses = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [systemResponse, myResponse] = await Promise.all([
          apiFetch("/api/courses"),
          isSignedIn && !isAdmin
            ? apiFetch("/api/my/courses")
            : Promise.resolve(null),
        ]);

        if (!systemResponse.ok) {
          throw new Error("Failed to load courses");
        }

        const systemData = await systemResponse.json();
        const myData =
          myResponse && myResponse.ok
            ? await myResponse.json()
            : { courses: [] };
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
  }, [isLoaded, isSignedIn, isAdmin, activeCourseId]);

  useEffect(() => {
    setOpenTopics({});
    setLatestOpenTopic(null);
  }, [activeCourseId]);

  useEffect(() => {
    let isMounted = true;
    if (!isLoaded) {
      return () => {
        isMounted = false;
      };
    }

    if (!isSignedIn) {
      setCanTrackProgress(false);
      return () => {
        isMounted = false;
      };
    }

    const loadProgress = async () => {
      setProgressError("");
      try {
        const response = await apiFetch("/api/my/progress");
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
  }, [isLoaded, isSignedIn]);

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
      const response = await apiFetch(`/api/my/progress/${subtopicId}`, {
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
          <span className="brand-name">GIGA CRACKED</span>
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
            <SignedOut>
              <span>Sign in to track your progress. </span>
              <SignInButton mode="redirect">
                <button type="button" className="sidebar-edit">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        )}
        <section className="topic-table" aria-label={`${activeTitle} topics`}>
          <ul className="topic-list">
            {topics.map((topic) => {
              const topicKey = topic.id ?? topic.title;
              const isOpen = !!openTopics[topicKey];
              const isLatest = isOpen && latestOpenTopic === topicKey;
              const completedCount = topic.subtopics.filter(
                (subtopic) => !!completedSubtopics[subtopic.id],
              ).length;
              const totalCount = topic.subtopics.length;
              const progressPercent =
                totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              return (
                <li
                  key={topicKey}
                  className={`topic-row${isOpen ? " is-open" : ""}${isLatest ? " is-latest" : ""}`}
                >
                <button
                  type="button"
                  className="topic-trigger"
                  onClick={() => {
                    setOpenTopics((current) => {
                      const nextOpen = !current[topicKey];
                      if (nextOpen) {
                        setLatestOpenTopic(topicKey);
                      } else if (latestOpenTopic === topicKey) {
                        setLatestOpenTopic(null);
                      }
                      return {
                        ...current,
                        [topicKey]: nextOpen,
                      };
                    });
                  }}
                  aria-expanded={isOpen}
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
                <div className="topic-progress" aria-hidden="true">
                  <div
                    className="topic-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div
                  className="topic-panel"
                  id={`topic-${toId(topic.title)}`}
                  role="region"
                  aria-label={`${topic.title} subtopics`}
                >
                  <div className="subtopic-meta">
                    <span className="subtopic-meta-title">Subtopics</span>
                    <span className="subtopic-meta-progress">
                      {completedCount}/{totalCount} done
                    </span>
                  </div>
                  <ul className="subtopic-list">
                    {topic.subtopics.map((subtopic) => {
                      const link = getSubtopicLink(subtopic);
                      return (
                        <li
                          key={subtopic.id ?? subtopic.title}
                        className={`subtopic-item${
                          completedSubtopics[subtopic.id] ? " is-done" : ""
                        }${link ? " has-link" : ""}`}
                          onClick={() => openSubtopicLink(link)}
                          onKeyDown={(event) => {
                            if ((event.key === "Enter" || event.key === " ") && link) {
                              event.preventDefault();
                              openSubtopicLink(link);
                            }
                          }}
                          role={link ? "link" : undefined}
                          tabIndex={link ? 0 : undefined}
                        >
                          <div className="subtopic-label">
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
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => handleToggleSubtopic(subtopic.id)}
                            />
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="subtopic-link"
                              >
                                <span className="subtopic-text">
                                  {getSubtopicTitle(subtopic)}
                                </span>
                              </a>
                            ) : (
                              <span className="subtopic-text">
                                {getSubtopicTitle(subtopic)}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default Explore;
