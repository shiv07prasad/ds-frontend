import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./EditCourses.css";

const INITIAL_COURSES = [
  "Statistics",
  "Data Science",
  "Machine Learning",
  "AI",
  "Backend Engineering",
  "DSA",
].map((name) => ({ name, topics: [] }));

function EditCourses() {
  const [courses, setCourses] = useState(INITIAL_COURSES);
  const [selectedCourse, setSelectedCourse] = useState(
    INITIAL_COURSES[0]?.name || "",
  );
  const [newCourse, setNewCourse] = useState("");
  const [topicInputs, setTopicInputs] = useState({});
  const [subtopicInputs, setSubtopicInputs] = useState({});

  const courseNames = useMemo(
    () => new Set(courses.map((course) => course.name.toLowerCase())),
    [courses],
  );

  const handleAddCourse = (event) => {
    event.preventDefault();
    const trimmed = newCourse.trim();
    if (!trimmed || courseNames.has(trimmed.toLowerCase())) {
      return;
    }
    setCourses((current) => [...current, { name: trimmed, topics: [] }]);
    setNewCourse("");
    setSelectedCourse(trimmed);
  };

  const handleAddTopic = (courseName) => {
    const key = `${courseName}::topic`;
    const value = (topicInputs[key] || "").trim();
    if (!value) {
      return;
    }
    setCourses((current) =>
      current.map((course) =>
        course.name === courseName
          ? {
              ...course,
              topics: [...course.topics, { title: value, subtopics: [] }],
            }
          : course,
      ),
    );
    setTopicInputs((current) => ({ ...current, [key]: "" }));
  };

  const handleAddSubtopic = (courseName, topicTitle) => {
    const key = `${courseName}::${topicTitle}::subtopic`;
    const value = (subtopicInputs[key] || "").trim();
    if (!value) {
      return;
    }
    setCourses((current) =>
      current.map((course) =>
        course.name === courseName
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.title === topicTitle
                  ? {
                      ...topic,
                      subtopics: [...topic.subtopics, value],
                    }
                  : topic,
              ),
            }
          : course,
      ),
    );
    setSubtopicInputs((current) => ({ ...current, [key]: "" }));
  };

  return (
    <div className="editor-page">
      <aside className="editor-sidebar" aria-label="Editor navigation">
        <div className="editor-brand">
          <span className="brand-name">ALTITUDE</span>
          <span className="sidebar-tag">Course Editor</span>
        </div>
        <div className="editor-course-list" aria-label="Course list">
          {courses.map((course) => (
            <button
              key={course.name}
              type="button"
              className={`editor-course-link${
                selectedCourse === course.name ? " is-active" : ""
              }`}
              onClick={() => setSelectedCourse(course.name)}
            >
              {course.name}
            </button>
          ))}
        </div>
        <Link to="/explore" className="editor-link">
          Back to Explore
        </Link>
        <Link to="/" className="editor-link ghost">
          Back to Home
        </Link>
      </aside>

      <main className="editor-content">
        <header className="editor-header">
          <p className="editor-eyebrow">Course Builder</p>
          <h1>Edit Courses</h1>
          <p className="editor-subhead">
            Add new courses, then define topics and subtopics for each course.
          </p>
        </header>

        <section className="editor-card">
          <h2>Add a new course</h2>
          <form className="editor-form" onSubmit={handleAddCourse}>
            <input
              type="text"
              value={newCourse}
              onChange={(event) => setNewCourse(event.target.value)}
              placeholder="Course name (e.g. Statistics)"
              className="editor-input"
            />
            <button type="submit" className="editor-button">
              Add course
            </button>
          </form>
        </section>
        {courses
          .filter((course) => course.name === selectedCourse)
          .map((course) => (
            <section key={course.name} className="editor-course">
              <div className="editor-course-header">
                <h3>{course.name}</h3>
                <div className="editor-course-count">
                  {course.topics.length} topics
                </div>
              </div>
              <div className="editor-inline">
                <input
                  type="text"
                  value={topicInputs[`${course.name}::topic`] || ""}
                  onChange={(event) =>
                    setTopicInputs((current) => ({
                      ...current,
                      [`${course.name}::topic`]: event.target.value,
                    }))
                  }
                  placeholder="Add a topic"
                  className="editor-input"
                />
                <button
                  type="button"
                  className="editor-button ghost"
                  onClick={() => handleAddTopic(course.name)}
                >
                  Add topic
                </button>
              </div>

              <div className="editor-topics">
                {course.topics.length === 0 ? (
                  <p className="editor-empty">No topics yet.</p>
                ) : (
                  course.topics.map((topic) => (
                    <div key={topic.title} className="editor-topic">
                      <div className="editor-topic-header">
                        <span>{topic.title}</span>
                        <span className="editor-course-count">
                          {topic.subtopics.length} subtopics
                        </span>
                      </div>
                      <div className="editor-inline">
                        <input
                          type="text"
                          value={
                            subtopicInputs[
                              `${course.name}::${topic.title}::subtopic`
                            ] || ""
                          }
                          onChange={(event) =>
                            setSubtopicInputs((current) => ({
                              ...current,
                              [`${course.name}::${topic.title}::subtopic`]:
                                event.target.value,
                            }))
                          }
                          placeholder="Add a subtopic"
                          className="editor-input"
                        />
                        <button
                          type="button"
                          className="editor-button ghost"
                          onClick={() =>
                            handleAddSubtopic(course.name, topic.title)
                          }
                        >
                          Add subtopic
                        </button>
                      </div>
                      {topic.subtopics.length > 0 && (
                        <ul className="editor-subtopics">
                          {topic.subtopics.map((subtopic) => (
                            <li key={subtopic}>{subtopic}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
      </main>
    </div>
  );
}

export default EditCourses;
