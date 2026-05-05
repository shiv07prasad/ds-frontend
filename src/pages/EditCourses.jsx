import { useEffect, useMemo, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "../lib/api";
import { SignInButton, SignedOut, useAuth } from "@clerk/clerk-react";
import "./EditCourses.css";

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createTempId = (entity) => `tmp-${entity}-${createId()}`;
const isTempId = (value) => typeof value === "string" && value.startsWith("tmp-");

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
        dragHandleProps: {
          ...attributes,
          ...listeners,
          ref: setActivatorNodeRef,
        },
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
      className={
        isDragging ? "editor-subtopic-row is-dragging" : "editor-subtopic-row"
      }
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
          ref: setActivatorNodeRef,
        },
      })}
    </tr>
  );
}

function EditCourses() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [courses, setCourses] = useState([]);
  const [savedCourses, setSavedCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [canEditCourses, setCanEditCourses] = useState(false);
  const [newCourse, setNewCourse] = useState("");
  const [topicInputs, setTopicInputs] = useState({});
  const [subtopicInputs, setSubtopicInputs] = useState({});
  const [subtopicLinkInputs, setSubtopicLinkInputs] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [editSubtopicTitle, setEditSubtopicTitle] = useState("");
  const [editSubtopicLink, setEditSubtopicLink] = useState("");
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const courseNames = useMemo(
    () => new Set(courses.map((course) => course.title.toLowerCase())),
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

    if (!isSignedIn) {
      setIsLoading(false);
      setLoadError("");
      setCanEditCourses(false);
      setCourses([]);
      setSavedCourses([]);
      setSelectedCourseId(null);
      return () => {
        isMounted = false;
      };
    }

    const loadCourses = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await apiFetch("/api/my/courses");
        if (!response.ok) {
          throw new Error("Failed to load courses");
        }
        const data = await response.json();
        if (!isMounted) {
          return;
        }
        const nextCourses = Array.isArray(data.courses) ? data.courses : [];
        setCourses(nextCourses);
        setSavedCourses(nextCourses);
        setCanEditCourses(true);
        if (nextCourses.length) {
          const hasSelected = nextCourses.some(
            (course) => course.id === selectedCourseId,
          );
          if (!hasSelected) {
            setSelectedCourseId(nextCourses[0].id);
          }
        } else {
          setSelectedCourseId(null);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError("Unable to load your courses right now.");
          setCanEditCourses(false);
          setCourses([]);
          setSavedCourses([]);
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
  }, [isLoaded, isSignedIn]);

  const handleAddCourse = (event) => {
    event.preventDefault();
    const trimmed = newCourse.trim();
    if (!trimmed || courseNames.has(trimmed.toLowerCase())) {
      return;
    }
    const createdCourse = {
      id: createTempId("course"),
      title: trimmed,
      topics: [],
      canEditCourse: true,
    };
    setCourses((current) => [...current, createdCourse]);
    setNewCourse("");
    setSelectedCourseId(createdCourse.id);
    setIsAddCourseOpen(false);
  };

  const startEditCourse = (courseId, title) => {
    setEditingCourseId(courseId);
    setEditCourseTitle(title ?? "");
  };

  const handleSaveCourse = () => {
    if (!editingCourseId) {
      return;
    }
    const nextTitle = editCourseTitle.trim();
    if (!nextTitle) {
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.id === editingCourseId ? { ...course, title: nextTitle } : course,
      ),
    );

    setEditingCourseId(null);
    setEditCourseTitle("");
  };

  const handleDeleteCourse = (courseId) => {
    if (!courseId) {
      return;
    }

    setCourses((current) => current.filter((course) => course.id !== courseId));
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
    }

    if (editingCourseId === courseId) {
      setEditingCourseId(null);
      setEditCourseTitle("");
    }
  };

  const handleAddTopic = (courseId) => {
    const key = `${courseId}::topic`;
    const value = (topicInputs[key] || "").trim();
    if (!value) {
      return;
    }

    const createdTopic = {
      id: createTempId("topic"),
      title: value,
      subtopics: [],
    };
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? { ...course, topics: [...course.topics, createdTopic] }
          : course,
      ),
    );
    setTopicInputs((current) => ({ ...current, [key]: "" }));
  };

  const handleAddSubtopic = (courseId, topicId) => {
    const key = `${courseId}::${topicId}::subtopic`;
    const linkKey = `${courseId}::${topicId}::subtopic-link`;
    const value = (subtopicInputs[key] || "").trim();
    const link = (subtopicLinkInputs[linkKey] || "").trim();
    if (!value || !link) {
      return;
    }

    const createdSubtopic = {
      id: createTempId("subtopic"),
      title: value,
      link,
    };
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.id === topicId
                  ? {
                      ...topic,
                      subtopics: [...topic.subtopics, createdSubtopic],
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

  const startEditTopic = (topicId, title) => {
    setEditingTopicId(topicId);
    setEditTopicTitle(title ?? "");
  };

  const handleSaveTopic = () => {
    if (!editingTopicId) {
      return;
    }
    const nextTitle = editTopicTitle.trim();
    if (!nextTitle) {
      return;
    }

    setCourses((current) =>
      current.map((course) => ({
        ...course,
        topics: course.topics.map((topic) =>
          topic.id === editingTopicId ? { ...topic, title: nextTitle } : topic,
        ),
      })),
    );

    setEditingTopicId(null);
    setEditTopicTitle("");
  };

  const handleDeleteTopic = (courseId, topicId) => {
    if (!topicId) {
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? { ...course, topics: course.topics.filter((topic) => topic.id !== topicId) }
          : course,
      ),
    );

    if (editingTopicId === topicId) {
      setEditingTopicId(null);
      setEditTopicTitle("");
    }
  };

  const startEditSubtopic = (courseId, topicId, subtopic, index) => {
    const parsed = getSubtopicParts(subtopic);
    setEditingRow({
      courseId,
      topicId,
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

    const subtopicId = editingRow.subtopicId;
    setCourses((current) =>
      current.map((course) =>
        course.id === editingRow.courseId
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.id === editingRow.topicId
                  ? {
                      ...topic,
                      subtopics: topic.subtopics.map((subtopic) => {
                        const parsed = getSubtopicParts(subtopic);
                        if (parsed.id !== subtopicId) {
                          return subtopic;
                        }
                        return {
                          id: parsed.id ?? createTempId("subtopic"),
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

  const handleDeleteSubtopic = (courseId, topicId, subtopicId) => {
    if (!subtopicId) {
      return;
    }
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              topics: course.topics.map((topic) =>
                topic.id === topicId
                  ? {
                      ...topic,
                      subtopics: topic.subtopics.filter((subtopic) => {
                        const parsed = getSubtopicParts(subtopic);
                        return parsed.id !== subtopicId;
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
      editingRow.courseId === courseId &&
      editingRow.topicId === topicId &&
      editingRow.subtopicId === subtopicId
    ) {
      setEditingRow(null);
      setEditSubtopicTitle("");
      setEditSubtopicLink("");
    }
  };

  const persistDraftChanges = async () => {
    const originalCourses = savedCourses;
    const workingCourses = JSON.parse(JSON.stringify(courses));
    const workingIds = new Set(workingCourses.map((course) => course.id));

    for (const originalCourse of originalCourses) {
      if (!isTempId(originalCourse.id) && !workingIds.has(originalCourse.id)) {
        const response = await apiFetch(`/api/my/courses/${originalCourse.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete course");
        }
      }
    }

    for (let courseIndex = 0; courseIndex < workingCourses.length; courseIndex += 1) {
      const course = workingCourses[courseIndex];
      const originalCourse = originalCourses.find((item) => item.id === course.id);
      let persistedCourseId = course.id;

      if (isTempId(course.id)) {
        const createResponse = await apiFetch("/api/my/courses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: course.title }),
        });
        if (!createResponse.ok) {
          throw new Error("Failed to create course");
        }
        const createData = await createResponse.json();
        persistedCourseId = createData.course?.id;
        if (!persistedCourseId) {
          throw new Error("Missing created course id");
        }
        course.id = persistedCourseId;
      } else {
        const updateResponse = await apiFetch(`/api/my/courses/${course.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: course.title }),
        });
        if (!updateResponse.ok) {
          throw new Error("Failed to update course");
        }
      }

      const previousTopics = originalCourse?.topics ?? [];
      const currentTopicIds = new Set(course.topics.map((topic) => topic.id));
      for (const previousTopic of previousTopics) {
        if (!isTempId(previousTopic.id) && !currentTopicIds.has(previousTopic.id)) {
          const deleteTopicResponse = await apiFetch(`/api/my/topics/${previousTopic.id}`, {
            method: "DELETE",
          });
          if (!deleteTopicResponse.ok) {
            throw new Error("Failed to delete topic");
          }
        }
      }

      for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex += 1) {
        const topic = course.topics[topicIndex];
        const originalTopic = previousTopics.find((item) => item.id === topic.id);
        let persistedTopicId = topic.id;

        if (isTempId(topic.id)) {
          const createTopicResponse = await apiFetch(`/api/my/courses/${persistedCourseId}/topics`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: topic.title }),
          });
          if (!createTopicResponse.ok) {
            throw new Error("Failed to create topic");
          }
          const createTopicData = await createTopicResponse.json();
          persistedTopicId = createTopicData.topic?.id;
          if (!persistedTopicId) {
            throw new Error("Missing created topic id");
          }
          topic.id = persistedTopicId;
        } else {
          const updateTopicResponse = await apiFetch(`/api/my/topics/${topic.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: topic.title }),
          });
          if (!updateTopicResponse.ok) {
            throw new Error("Failed to update topic");
          }
        }

        const previousSubtopics = originalTopic?.subtopics ?? [];
        const currentSubtopicIds = new Set(
          topic.subtopics.map((subtopic) => getSubtopicParts(subtopic).id),
        );
        for (const previousSubtopic of previousSubtopics) {
          const previousSubtopicId = getSubtopicParts(previousSubtopic).id;
          if (
            previousSubtopicId &&
            !isTempId(previousSubtopicId) &&
            !currentSubtopicIds.has(previousSubtopicId)
          ) {
            const deleteSubtopicResponse = await apiFetch(
              `/api/my/subtopics/${previousSubtopicId}`,
              { method: "DELETE" },
            );
            if (!deleteSubtopicResponse.ok) {
              throw new Error("Failed to delete subtopic");
            }
          }
        }

        for (
          let subtopicIndex = 0;
          subtopicIndex < topic.subtopics.length;
          subtopicIndex += 1
        ) {
          const parsedSubtopic = getSubtopicParts(topic.subtopics[subtopicIndex]);
          const payload = { title: parsedSubtopic.title, link: parsedSubtopic.link };

          if (parsedSubtopic.id && isTempId(parsedSubtopic.id)) {
            const createSubtopicResponse = await apiFetch(
              `/api/my/topics/${persistedTopicId}/subtopics`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            if (!createSubtopicResponse.ok) {
              throw new Error("Failed to create subtopic");
            }
            const createSubtopicData = await createSubtopicResponse.json();
            const newSubtopicId = createSubtopicData.subtopic?.id;
            if (!newSubtopicId) {
              throw new Error("Missing created subtopic id");
            }
            topic.subtopics[subtopicIndex] = { ...parsedSubtopic, id: newSubtopicId };
          } else if (parsedSubtopic.id) {
            const updateSubtopicResponse = await apiFetch(
              `/api/my/subtopics/${parsedSubtopic.id}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            if (!updateSubtopicResponse.ok) {
              throw new Error("Failed to update subtopic");
            }
          }
        }

        await Promise.all(
          topic.subtopics.map(async (subtopic, index) => {
            const parsedSubtopic = getSubtopicParts(subtopic);
            const response = await apiFetch(
              `/api/my/subtopics/${parsedSubtopic.id}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sort_order: index + 1 }),
              },
            );
            if (!response.ok) {
              throw new Error("Failed to reorder subtopics");
            }
          }),
        );
      }

      await Promise.all(
        course.topics.map(async (topic, index) => {
          const response = await apiFetch(`/api/my/topics/${topic.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sort_order: index + 1 }),
          });
          if (!response.ok) {
            throw new Error("Failed to reorder topics");
          }
        }),
      );
    }

    setCourses(workingCourses);
    setSavedCourses(workingCourses);
  };

  const handleSaveChanges = async () => {
    setLoadError("");
    setIsSaving(true);
    try {
      await persistDraftChanges();
      setPendingNavigation(null);
    } catch {
      setLoadError("Unable to save changes right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setCourses(savedCourses);
    setEditingRow(null);
    setEditingTopicId(null);
    setEditTopicTitle("");
    setEditingCourseId(null);
    setEditCourseTitle("");
    setEditSubtopicTitle("");
    setEditSubtopicLink("");
    setPendingNavigation(null);
    if (savedCourses.length) {
      const hasSelected = savedCourses.some(
        (course) => course.id === selectedCourseId,
      );
      if (!hasSelected) {
        setSelectedCourseId(savedCourses[0].id);
      }
    } else {
      setSelectedCourseId(null);
    }
  };

  const attemptNavigate = (path) => {
    navigate(path);
  };

  const handleSaveAndLeave = async () => {
    if (!pendingNavigation || blocker.state !== "blocked") {
      return;
    }
    setLoadError("");
    setIsSaving(true);
    try {
      await persistDraftChanges();
      setPendingNavigation(null);
      blocker.proceed();
    } catch {
      setLoadError("Unable to save changes right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAndLeave = () => {
    if (!pendingNavigation || blocker.state !== "blocked") {
      return;
    }
    setCourses(savedCourses);
    setEditingRow(null);
    setEditingTopicId(null);
    setEditTopicTitle("");
    setEditingCourseId(null);
    setEditCourseTitle("");
    setEditSubtopicTitle("");
    setEditSubtopicLink("");
    setPendingNavigation(null);
    blocker.proceed();
  };

  const selectedCourseData = courses.find(
    (course) => course.id === selectedCourseId,
  );
  const topicItems = (selectedCourseData?.topics ?? []).map(
    (topic, index) => topic.id ?? `${topic.title}-${index}`,
  );

  const handleTopicDragEnd = (event, courseId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setCourses((current) =>
      current.map((course) => {
        if (course.id !== courseId) {
          return course;
        }
        const ids = course.topics.map(
          (topic, index) => topic.id ?? `${topic.title}-${index}`,
        );
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

  const handleSubtopicDragEnd = (event, courseId, topicId) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              topics: course.topics.map((topic) => {
                if (topic.id !== topicId) {
                  return topic;
                }
                const ids = topic.subtopics.map((subtopic, index) => {
                  const parsed = getSubtopicParts(subtopic);
                  return parsed.id ?? `${topic.id}-${index}`;
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
          <span className="brand-name">GIGA CRACKED</span>
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
                key={course.id ?? course.title}
                type="button"
                className={`editor-course-link${
                  selectedCourseId === course.id ? " is-active" : ""
                }`}
                onClick={() => setSelectedCourseId(course.id)}
              >
                {course.title}
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
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <p className="editor-subhead">
            Add new courses, then define topics and subtopics for each course.
          </p>
        </header>
        {isLoading && <p className="editor-subhead">Loading your courses...</p>}
        {loadError && !isLoading && (
          <p className="editor-subhead">{loadError}</p>
        )}
        {!canEditCourses && !loadError && !isLoading && (
          <div className="editor-subhead">
            <SignedOut>
              <span>Sign in to edit your courses. </span>
              <SignInButton mode="redirect">
                <button type="button" className="editor-link">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        )}
        {courses
          .filter((course) => course.id === selectedCourseId)
          .map((course) => ({
            ...course,
            canEditCourse: isAdmin || course.is_system === 0,
          }))
          .map((course) => (
            <section key={course.id ?? course.title} className="editor-course">
              <div className="editor-course-header">
                {editingCourseId === course.id ? (
                  <input
                    type="text"
                    value={editCourseTitle}
                    onChange={(event) => setEditCourseTitle(event.target.value)}
                    className="editor-input editor-table-input"
                    placeholder="Course title"
                  />
                ) : (
                  <h3>{course.title}</h3>
                )}
                <div className="editor-row-actions">
                  {editingCourseId === course.id ? (
                    <>
                      <button
                        type="button"
                        className="editor-icon-button"
                        onClick={handleSaveCourse}
                        aria-label="Save course"
                        title="Save"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="editor-icon-button"
                        onClick={() => {
                          setEditingCourseId(null);
                          setEditCourseTitle("");
                        }}
                        aria-label="Cancel editing course"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="editor-icon-button danger"
                        onClick={() => handleDeleteCourse(course.id)}
                        aria-label="Delete course"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="editor-icon-button"
                      onClick={() => startEditCourse(course.id, course.title)}
                      disabled={!course.canEditCourse}
                      aria-label="Edit course"
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}
                  <div className="editor-course-count">
                    {course.topics.length} topics
                  </div>
                </div>
              </div>
              <div className="editor-inline">
                <input
                  type="text"
                  value={topicInputs[`${course.id}::topic`] || ""}
                  onChange={(event) =>
                    setTopicInputs((current) => ({
                      ...current,
                      [`${course.id}::topic`]: event.target.value,
                    }))
                  }
                  placeholder="Add a topic"
                  className="editor-input"
                  disabled={!course.canEditCourse}
                />
                <button
                  type="button"
                  className="editor-button ghost"
                  onClick={() => handleAddTopic(course.id)}
                  disabled={!course.canEditCourse}
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
                    onDragEnd={(event) => handleTopicDragEnd(event, course.id)}
                  >
                    <SortableContext
                      items={topicItems}
                      strategy={verticalListSortingStrategy}
                    >
                      {course.topics.map((topic, topicIndex) => {
                        const topicId =
                          topic.id ?? `${topic.title}-${topicIndex}`;
                        const subtopicItems = topic.subtopics.map(
                          (subtopic, subtopicIndex) => {
                            const parsed = getSubtopicParts(subtopic);
                            return parsed.id ?? `${topicId}-${subtopicIndex}`;
                          },
                        );

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
                                      {...(course.canEditCourse
                                        ? dragHandleProps
                                        : {})}
                                      disabled={!course.canEditCourse}
                                      aria-label={`Reorder topic ${topic.title}`}
                                      title="Drag to reorder topic"
                                    >
                                      ::
                                    </button>
                                    {editingTopicId === topic.id ? (
                                      <input
                                        type="text"
                                        value={editTopicTitle}
                                        onChange={(event) =>
                                          setEditTopicTitle(event.target.value)
                                        }
                                        className="editor-input editor-table-input"
                                        placeholder="Topic title"
                                      />
                                    ) : (
                                      <span>{topic.title}</span>
                                    )}
                                  </div>
                                  <div className="editor-row-actions">
                                    {editingTopicId === topic.id ? (
                                      <>
                                        <button
                                          type="button"
                                          className="editor-icon-button"
                                          onClick={handleSaveTopic}
                                          aria-label="Save topic"
                                          title="Save"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          className="editor-icon-button"
                                          onClick={() => {
                                            setEditingTopicId(null);
                                            setEditTopicTitle("");
                                          }}
                                          aria-label="Cancel editing topic"
                                          title="Cancel"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="editor-icon-button danger"
                                          onClick={() =>
                                            handleDeleteTopic(
                                              course.id,
                                              topic.id,
                                            )
                                          }
                                          aria-label="Delete topic"
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
                                          startEditTopic(topic.id, topic.title)
                                        }
                                        disabled={!course.canEditCourse}
                                        aria-label="Edit topic"
                                        title="Edit"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <span className="editor-course-count">
                                      {topic.subtopics.length} subtopics
                                    </span>
                                  </div>
                                </div>
                                <div className="editor-inline">
                                  <input
                                    type="text"
                                    value={
                                      subtopicInputs[
                                        `${course.id}::${topic.id}::subtopic`
                                      ] || ""
                                    }
                                    onChange={(event) =>
                                      setSubtopicInputs((current) => ({
                                        ...current,
                                        [`${course.id}::${topic.id}::subtopic`]:
                                          event.target.value,
                                      }))
                                    }
                                    placeholder="Add a subtopic"
                                    className="editor-input"
                                    disabled={!course.canEditCourse}
                                  />
                                  <input
                                    type="url"
                                    value={
                                      subtopicLinkInputs[
                                        `${course.id}::${topic.id}::subtopic-link`
                                      ] || ""
                                    }
                                    onChange={(event) =>
                                      setSubtopicLinkInputs((current) => ({
                                        ...current,
                                        [`${course.id}::${topic.id}::subtopic-link`]:
                                          event.target.value,
                                      }))
                                    }
                                    placeholder="Paste Link"
                                    className="editor-input editor-link-input"
                                    disabled={!course.canEditCourse}
                                  />
                                  <button
                                    type="button"
                                    className="editor-button ghost"
                                    onClick={() =>
                                      handleAddSubtopic(course.id, topic.id)
                                    }
                                    disabled={!course.canEditCourse}
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
                                          course.id,
                                          topic.id,
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
                                            {topic.subtopics.map(
                                              (subtopic, index) => {
                                                const parsed =
                                                  getSubtopicParts(subtopic);
                                                const rowId =
                                                  parsed.id ??
                                                  `${topic.title}-${index}`;
                                                const isEditing =
                                                  !!editingRow &&
                                                  editingRow.courseId ===
                                                    course.id &&
                                                  editingRow.topicId ===
                                                    topic.id &&
                                                  ((editingRow.subtopicId &&
                                                    parsed.id ===
                                                      editingRow.subtopicId) ||
                                                    (!editingRow.subtopicId &&
                                                      editingRow.index ===
                                                        index));

                                                return (
                                                  <SubtopicRow
                                                    key={rowId}
                                                    id={rowId}
                                                  >
                                                    {({ dragHandleProps }) => (
                                                      <>
                                                        <td className="editor-drag-cell">
                                                          <button
                                                            type="button"
                                                            className="editor-drag-handle"
                                                            ref={
                                                              dragHandleProps.ref
                                                            }
                                                            {...(course.canEditCourse
                                                              ? dragHandleProps
                                                              : {})}
                                                            disabled={
                                                              !course.canEditCourse
                                                            }
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
                                                              value={
                                                                editSubtopicTitle
                                                              }
                                                              onChange={(
                                                                event,
                                                              ) =>
                                                                setEditSubtopicTitle(
                                                                  event.target
                                                                    .value,
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
                                                              value={
                                                                editSubtopicLink
                                                              }
                                                              onChange={(
                                                                event,
                                                              ) =>
                                                                setEditSubtopicLink(
                                                                  event.target
                                                                    .value,
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
                                                                  onClick={
                                                                    handleSaveSubtopic
                                                                  }
                                                                  aria-label="Save subtopic"
                                                                  title="Save"
                                                                >
                                                                  Save
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  className="editor-icon-button"
                                                                  onClick={() => {
                                                                    setEditingRow(
                                                                      null,
                                                                    );
                                                                    setEditSubtopicTitle(
                                                                      "",
                                                                    );
                                                                    setEditSubtopicLink(
                                                                      "",
                                                                    );
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
                                                                      course.id,
                                                                      topic.id,
                                                                      parsed.id,
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
                                                                    course.id,
                                                                    topic.id,
                                                                    subtopic,
                                                                    index,
                                                                  )
                                                                }
                                                                disabled={
                                                                  !course.canEditCourse
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
                                              },
                                            )}
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
