import {
  getCreatedAtValue,
  normalizeTask,
  sortTasksByCreatedAtAsc,
} from "./ToDoApp";

describe("task utilities", () => {
  test("getCreatedAtValue handles various timestamp formats", () => {
    const firestoreLike = { toMillis: () => 1234 };
    expect(getCreatedAtValue({ createdAt: firestoreLike })).toBe(1234);

    const serverTimestamp = { seconds: 10, nanoseconds: 500000000 };
    expect(getCreatedAtValue({ createdAt: serverTimestamp })).toBe(10500);

    const date = new Date("2024-01-01T00:00:00Z");
    expect(getCreatedAtValue({ createdAt: date })).toBe(date.getTime());

    expect(getCreatedAtValue({ createdAt: "2024-01-01T12:00:00Z" })).toBe(
      Date.parse("2024-01-01T12:00:00Z")
    );

    expect(getCreatedAtValue({})).toBe(0);
  });

  test("sortTasksByCreatedAtAsc orders tasks oldest first", () => {
    const tasks = [
      { id: "b", createdAt: 200 },
      { id: "a", createdAt: 100 },
      { id: "c", createdAt: 300 },
    ];

    const sortedIds = sortTasksByCreatedAtAsc(tasks).map((task) => task.id);
    expect(sortedIds).toEqual(["a", "b", "c"]);
  });

  test("normalizeTask fills in defaults and preserves provided values", () => {
    const normalized = normalizeTask({
      Title: "Test",
      Description: "Details",
      Status: "done",
      createdAt: 123,
      id: "custom",
    });

    expect(normalized).toMatchObject({
      Title: "Test",
      Description: "Details",
      Status: "done",
      createdAt: 123,
      id: "custom",
    });

    const fallback = normalizeTask();
    expect(fallback.Title).toBe("");
    expect(fallback.Status).toBe("todo");
    expect(typeof fallback.id).toBe("string");
    expect(fallback.id.length).toBeGreaterThan(0);
  });
});
