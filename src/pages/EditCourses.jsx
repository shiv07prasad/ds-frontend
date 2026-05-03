import { useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./EditCourses.css";

const INITIAL_COURSES = [
  "Statistics",
  "Data Science",
  "Machine Learning",
  "AI",
  "Backend Engineering",
  "DSA",
].map((name) => ({ name, topics: [] }));

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getSubtopicParts = (subtopic) =>
  typeof subtopic === "string"
    ? { id: null, title: subtopic, link: "" }
    : {
        id: subtopic.id ?? null,
        title: subtopic.title ?? "",
        link: subtopic.link ?? "",
      };

function TopicCard({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`editor-topic${isDragging ? " is-dragging" : ""}`}
    >
      {children({
        dragHandleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef },
      })}
    </div>
  );
}

function SubtopicRow({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={isDragging ? "editor-subtopic-row is-dragging" : "editor-subtopic-row"}
    >
      {children({
        dragHandleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef },
      })}
    </tr>
  );
}

function EditCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState(INITIAL_COURSES);
  const [savedCourses, setSavedCourses] = useState(INITIAL_COURSES);
  const [selectedCourse, setSelectedCourse] = useState(
    INITIAL_COURSES[0]?.name || "",
  );
  const [newCourse, setNewCourse] = useState("");
  const [topicInputs, setTopicInputs] = useState({});
  const [subtopicInputs, setSubtopicInputs] = useState({});
  const [subtopicLinkInputs, setSubtopicLinkInputs] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [editSubtopicTitle, setEditSubtopicTitle] = useState("");
  const [editSubtopicLink, setEditSubtopicLink] = useState("");
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const courseNames = useMemo(
    () => new Set(courses.map((course) => course.name.toLowerCase())),
    [courses],
  );
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(courses) !== JSON.stringify(savedCourses),
    [courses, savedCourses],
  );
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }
    const destination = `${blocker.location.pathname}${blocker.location.search}${blocker.location.hash}`;
    setPendingNavigation(destination);
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAddCourse = (event) => {
    event.preventDefault();
    const trimmed = newCourse.trim();
    if (!trimmed || courseNames.has(trimmed.toLowerCase())) {
      return;
    }
    setCourses((current) => [...current, { name: trimmed, topics: [] }]);
    setNewCourse("");
    setSelectedCourse(trimmed);
    setIsAddCourseOpen(false);
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
              topics: [...course.topics, { id: createId(), title: value, subtopics: [] }],
            }
          : course,
      ),
    );
    setTopicInputs((current) => ({ ...current, [key]: "" }));
  };

  const handleAddSubtopic = (courseName, topicTitle) => {
    const key = `${courseName}::${topicTitle}::subtopic`;
    const linkKey = `${courseName}::${topicTitle}::subtopic-link`;
    const value = (subtopicInputs[key] || "").trim();
    const link = (subtopicLinkInputs[linkKey] || "").trim();
    if (!value || !link) {
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
                      subtopics: [
                        ...topic.subtopics,
                        { id: createId(), title: value, link },
                      ],
                    }
                  : topic,
              ),
            }
          : course,
      ),
    );
    setSubtopicInputs((current) => ({ ...current, [key]: "" }));
    setSubtopicLinkInputs((current) => ({ ...current, [linkKey]: "" }));
  };

  const startEditSubtopic = (courseName, topicTitle, subtopic, index) => {
    const parsed = getSubtopicParts(subtopic);
    setEditingRow({
      courseName,
      topicTitle,
      subtopicId: parsed.id,
      index,
    });
    setEditSubtopicTitle(parsed.title);
    setEditSubtopicLink(parsed.link);
  };

  const handleSaveSubtopic = () => {
    if (!editingRow) {
      return;
    }
    const nextTitle = editSubtopicTitle.trim();
    const nextLink = editSubtopicLink.trim();
    if (!nextTitle || !nextLink) {
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.name === editingRow.courseName
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.title === editingRow.topicTitle
                  ? {
                      ...topic,
                      subtopics: topic.subtopics.map((subtopic, index) => {
                        const parsed = getSubtopicParts(subtopic);
                        const matches =
                          (editingRow.subtopicId &&
                            parsed.id === editingRow.subtopicId) ||
                          (!editingRow.subtopicId && index === editingRow.index);
                        if (!matches) {
                          return subtopic;
                        }
                        return {
                          id: parsed.id ?? createId(),
                          title: nextTitle,
                          link: nextLink,
                        };
                      }),
                    }
                  : topic,
              ),
            }
          : course,
      ),
    );

    setEditingRow(null);
    setEditSubtopicTitle("");
    setEditSubtopicLink("");
  };

  const handleDeleteSubtopic = (
    courseName,
    topicTitle,
    subtopicId,
    indexToDelete,
  ) => {
    setCourses((current) =>
      current.map((course) =>
        course.name === courseName
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.title === topicTitle
                  ? {
                      ...topic,
                      subtopics: topic.subtopics.filter((subtopic, index) => {
                        const parsed = getSubtopicParts(subtopic);
                        if (subtopicId) {
                          return parsed.id !== subtopicId;
                        }
                        return index !== indexToDelete;
                      }),
                    }
                  : topic,
              ),
            }
          : course,
      ),
    );

    if (
      editingRow &&
      editingRow.courseName === courseName &&
      editingRow.topicTitle === topicTitle &&
      ((editingRow.subtopicId && editingRow.subtopicId === subtopicId) ||
        (!editingRow.subtopicId && editingRow.index === indexToDelete))
    ) {
      setEditingRow(null);
      setEditSubtopicTitle("");
      setEditSubtopicLink("");
    }
  };

  const handleSaveChanges = () => {
    setSavedCourses(courses);
    setPendingNavigation(null);
  };

  const handleCancelChanges = () => {
    setCourses(savedCourses);
    setEditingRow(null);
    setEditSubtopicTitle("");
    setEditSubtopicLink("");
    setPendingNavigation(null);
  };

  const attemptNavigate = (path) => {
    navigate(path);
  };

  const handleSaveAndLeave = () => {
    if (!pendingNavigation || blocker.state !== "blocked") {
      return;
    }
    setSavedCourses(courses);
    setPendingNavigation(null);
    blocker.proceed();
  };

  const handleCancelAndLeave = () => {
    if (!pendingNavigation || blocker.state !== "blocked") {
      return;
    }
    setCourses(savedCourses);
    setEditingRow(null);
    setEditSubtopicTitle("");
    setEditSubtopicLink("");
    setPendingNavigation(null);
    blocker.proceed();
  };

  const selectedCourseData = courses.find((course) => course.name === selectedCourse);
  const topicItems = (selectedCourseData?.topics ?? []).map((topic, index) =>
    topic.id ?? `${topic.title}-${index}`,
  );

  const handleTopicDragEnd = (event, courseName) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setCourses((current) =>
      current.map((course) => {
        if (course.name !== courseName) {
          return course;
        }
        const ids = course.topics.map((topic, index) => topic.id ?? `${topic.title}-${index}`);
        const oldIndex = ids.indexOf(active.id);
        const newIndex = ids.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) {
          return course;
        }
        return {
          ...course,
          topics: arrayMove(course.topics, oldIndex, newIndex),
        };
      }),
    );
  };

  const handleSubtopicDragEnd = (event, courseName, topicTitle) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.name === courseName
          ? {
              ...course,
              topics: course.topics.map((topic) => {
                if (topic.title !== topicTitle) {
                  return topic;
                }
                const ids = topic.subtopics.map((subtopic, index) => {
                  const parsed = getSubtopicParts(subtopic);
                  return parsed.id ?? `${topicTitle}-${index}`;
                });
                const oldIndex = ids.indexOf(active.id);
                const newIndex = ids.indexOf(over.id);
                if (oldIndex < 0 || newIndex < 0) {
                  return topic;
                }
                return {
                  ...topic,
                  subtopics: arrayMove(topic.subtopics, oldIndex, newIndex),
                };
              }),
            }
          : course,
      ),
    );
  };

  return (
    <div className="editor-page">
      <aside className="editor-sidebar" aria-label="Editor navigation">
        <div className="editor-brand">
          <span className="brand-name">ALTITUDE</span>
          <span className="sidebar-tag">Course Editor</span>
        </div>
        <section
          className={`editor-add-course${isAddCourseOpen ? " is-open" : ""}`}
          aria-label="Add course"
        >
          <button
            type="button"
            className="editor-add-course-toggle"
            onClick={() => setIsAddCourseOpen((current) => !current)}
            aria-expanded={isAddCourseOpen}
            aria-controls="add-course-modal"
          >
            <span className="editor-add-course-toggle-text">Add course</span>
            <span className="editor-add-course-toggle-icon" aria-hidden="true">
              {isAddCourseOpen ? "-" : "+"}
            </span>
          </button>
        </section>
        <div className="editor-sidebar-main">
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
        </div>
        <div className="editor-sidebar-actions">
          <button
            type="button"
            className="editor-link"
            onClick={() => attemptNavigate("/explore")}
          >
            Back to Explore
          </button>
          <button
            type="button"
            className="editor-link ghost"
            onClick={() => attemptNavigate("/")}
          >
            Back to Home
          </button>
        </div>
      </aside>

      <main className="editor-content">
        <header className="editor-header">
          <div className="editor-header-top">
            <div>
              <p className="editor-eyebrow">Course Builder</p>
              <h1>Edit Courses</h1>
            </div>
            <button
              type="button"
              className={`editor-save-button${hasUnsavedChanges ? " is-dirty" : ""}`}
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges}
            >
              Save Changes
            </button>
          </div>
          <p className="editor-subhead">
            Add new courses, then define topics and subtopics for each course.
          </p>
        </header>
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
                  <DndContext
                    sensors={sensors}
                    onDragEnd={(event) => handleTopicDragEnd(event, course.name)}
                  >
                    <SortableContext
                      items={topicItems}
                      strategy={verticalListSortingStrategy}
                    >
                      {course.topics.map((topic, topicIndex) => {
                        const topicId = topic.id ?? `${topic.title}-${topicIndex}`;
                        const subtopicItems = topic.subtopics.map((subtopic, subtopicIndex) => {
                          const parsed = getSubtopicParts(subtopic);
                          return parsed.id ?? `${topic.title}-${subtopicIndex}`;
                        });

                        return (
                          <TopicCard key={topicId} id={topicId}>
                            {({ dragHandleProps }) => (
                              <>
                                <div className="editor-topic-header">
                                  <div className="editor-topic-title-wrap">
                                    <button
                                      type="button"
                                      className="editor-drag-handle"
                                      ref={dragHandleProps.ref}
                                      {...dragHandleProps}
                                      aria-label={`Reorder topic ${topic.title}`}
                                      title="Drag to reorder topic"
                                    >
                                      ::
                                    </button>
                                    <span>{topic.title}</span>
                                  </div>
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
                                  <input
                                    type="url"
                                    value={
                                      subtopicLinkInputs[
                                        `${course.name}::${topic.title}::subtopic-link`
                                      ] || ""
                                    }
                                    onChange={(event) =>
                                      setSubtopicLinkInputs((current) => ({
                                        ...current,
                                        [`${course.name}::${topic.title}::subtopic-link`]:
                                          event.target.value,
                                      }))
                                    }
                                    placeholder="Paste Link"
                                    className="editor-input editor-link-input"
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
                                  <div className="editor-subtopics-table-wrap">
                                    <DndContext
                                      sensors={sensors}
                                      onDragEnd={(event) =>
                                        handleSubtopicDragEnd(
                                          event,
                                          course.name,
                                          topic.title,
                                        )
                                      }
                                    >
                                      <table className="editor-subtopics-table">
                                        <colgroup>
                                          <col className="editor-subtopics-col-drag" />
                                          <col className="editor-subtopics-col-title" />
                                          <col className="editor-subtopics-col-link" />
                                          <col className="editor-subtopics-col-edit" />
                                        </colgroup>
                                        <thead>
                                          <tr>
                                            <th aria-label="Drag" />
                                            <th>Sub topic</th>
                                            <th>Link</th>
                                            <th>Edit</th>
                                          </tr>
                                        </thead>
                                        <SortableContext
                                          items={subtopicItems}
                                          strategy={verticalListSortingStrategy}
                                        >
                                          <tbody>
                                            {topic.subtopics.map((subtopic, index) => {
                                              const parsed = getSubtopicParts(subtopic);
                                              const rowId =
                                                parsed.id ?? `${topic.title}-${index}`;
                                              const isEditing =
                                                !!editingRow &&
                                                editingRow.courseName === course.name &&
                                                editingRow.topicTitle === topic.title &&
                                                ((editingRow.subtopicId &&
                                                  parsed.id === editingRow.subtopicId) ||
                                                  (!editingRow.subtopicId &&
                                                    editingRow.index === index));

                                              return (
                                                <SubtopicRow key={rowId} id={rowId}>
                                                  {({ dragHandleProps }) => (
                                                    <>
                                                      <td className="editor-drag-cell">
                                                        <button
                                                          type="button"
                                                          className="editor-drag-handle"
                                                          ref={dragHandleProps.ref}
                                                          {...dragHandleProps}
                                                          aria-label={`Reorder subtopic ${parsed.title}`}
                                                          title="Drag to reorder subtopic"
                                                        >
                                                          ::
                                                        </button>
                                                      </td>
                                                      <td>
                                                        {isEditing ? (
                                                          <input
                                                            type="text"
                                                            value={editSubtopicTitle}
                                                            onChange={(event) =>
                                                              setEditSubtopicTitle(
                                                                event.target.value,
                                                              )
                                                            }
                                                            className="editor-input editor-table-input"
                                                            placeholder="Sub topic title"
                                                          />
                                                        ) : (
                                                          <span className="editor-subtopic-title">
                                                            {parsed.title}
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td>
                                                        {isEditing ? (
                                                          <input
                                                            type="url"
                                                            value={editSubtopicLink}
                                                            onChange={(event) =>
                                                              setEditSubtopicLink(
                                                                event.target.value,
                                                              )
                                                            }
                                                            className="editor-input editor-table-input"
                                                            placeholder="YouTube link"
                                                          />
                                                        ) : parsed.link ? (
                                                          <a
                                                            href={parsed.link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="editor-subtopic-link"
                                                          >
                                                            {parsed.link}
                                                          </a>
                                                        ) : (
                                                          <span className="editor-subtopic-empty-link">
                                                            -
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td>
                                                        <div className="editor-row-actions">
                                                          {isEditing ? (
                                                            <>
                                                              <button
                                                                type="button"
                                                                className="editor-icon-button"
                                                                onClick={handleSaveSubtopic}
                                                                aria-label="Save subtopic"
                                                                title="Save"
                                                              >
                                                                Save
                                                              </button>
                                                              <button
                                                                type="button"
                                                                className="editor-icon-button"
                                                                onClick={() => {
                                                                  setEditingRow(null);
                                                                  setEditSubtopicTitle("");
                                                                  setEditSubtopicLink("");
                                                                }}
                                                                aria-label="Cancel editing subtopic"
                                                                title="Cancel"
                                                              >
                                                                Cancel
                                                              </button>
                                                              <button
                                                                type="button"
                                                                className="editor-icon-button danger"
                                                                onClick={() =>
                                                                  handleDeleteSubtopic(
                                                                    course.name,
                                                                    topic.title,
                                                                    parsed.id,
                                                                    index,
                                                                  )
                                                                }
                                                                aria-label="Delete subtopic"
                                                                title="Delete"
                                                              >
                                                                Delete
                                                              </button>
                                                            </>
                                                          ) : (
                                                            <button
                                                              type="button"
                                                              className="editor-icon-button"
                                                              onClick={() =>
                                                                startEditSubtopic(
                                                                  course.name,
                                                                  topic.title,
                                                                  subtopic,
                                                                  index,
                                                                )
                                                              }
                                                              aria-label="Edit subtopic"
                                                              title="Edit"
                                                            >
                                                              Edit
                                                            </button>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </>
                                                  )}
                                                </SubtopicRow>
                                              );
                                            })}
                                          </tbody>
                                        </SortableContext>
                                      </table>
                                    </DndContext>
                                  </div>
                                )}
                              </>
                            )}
                          </TopicCard>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </section>
          ))}
      </main>
      {isAddCourseOpen && (
        <div
          className="editor-modal-backdrop"
          role="presentation"
          onClick={() => setIsAddCourseOpen(false)}
        >
          <div
            id="add-course-modal"
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-course-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="editor-modal-header">
              <h2 id="add-course-title" className="editor-modal-title">
                Add course
              </h2>
              <button
                type="button"
                className="editor-modal-close"
                onClick={() => setIsAddCourseOpen(false)}
                aria-label="Close add course"
              >
                x
              </button>
            </div>
            <form className="editor-modal-form" onSubmit={handleAddCourse}>
              <label className="editor-modal-label" htmlFor="new-course-name">
                Course name
              </label>
              <input
                id="new-course-name"
                type="text"
                value={newCourse}
                onChange={(event) => setNewCourse(event.target.value)}
                placeholder="e.g. Statistics"
                className="editor-input editor-modal-input"
                autoFocus
              />
              <div className="editor-modal-actions">
                <button
                  type="button"
                  className="editor-button ghost"
                  onClick={() => setIsAddCourseOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="editor-button">
                  Add course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {pendingNavigation && (
        <div
          className="editor-modal-backdrop"
          role="presentation"
          onClick={() => setPendingNavigation(null)}
        >
          <div
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="editor-modal-header">
              <h2 id="unsaved-changes-title" className="editor-modal-title">
                Unsaved changes
              </h2>
            </div>
            <p className="editor-modal-copy">
              Save or cancel your edits before leaving this page.
            </p>
            <div className="editor-modal-actions">
              <button
                type="button"
                className="editor-button"
                onClick={handleSaveAndLeave}
              >
                Save and Leave
              </button>
              <button
                type="button"
                className="editor-button ghost"
                onClick={handleCancelAndLeave}
              >
                Cancel Changes
              </button>
              <button
                type="button"
                className="editor-button ghost"
                onClick={() => {
                  setPendingNavigation(null);
                  if (blocker.state === "blocked") {
                    blocker.reset();
                  }
                }}
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditCourses;
