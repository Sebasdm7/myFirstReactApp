const LOCAL_USER_ID_STORAGE_KEY = "todoAppUserId";

const generateAnonymousUserId = () =>
  `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const resolveUserId = (explicitId) => {
  if (explicitId) {
    return explicitId;
  }

  if (process.env.REACT_APP_TODO_USER_ID) {
    return process.env.REACT_APP_TODO_USER_ID;
  }

  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : null;

  if (!storage) {
    return "anonymous";
  }

  const storedId = storage.getItem(LOCAL_USER_ID_STORAGE_KEY);
  if (storedId) {
    return storedId;
  }

  const generatedId = generateAnonymousUserId();
  storage.setItem(LOCAL_USER_ID_STORAGE_KEY, generatedId);
  return generatedId;
};

export { LOCAL_USER_ID_STORAGE_KEY, resolveUserId, generateAnonymousUserId };
