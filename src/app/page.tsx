"use client";

import { useEffect, useRef, useState } from "react";
import { createLogger, Logger } from "@/lib/logger";

const logger = createLogger({
  level: "info",
  redactKeys: ["password", "token", "authorization"],
});

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

const callWithRetry = async (
  fn: () => Promise<unknown>,
  opt?: { limit?: number; cap?: number; base?: number; exp?: number },
  depth = 0,
): Promise<unknown> => {
  try {
    return await fn();
  } catch (error) {
    if (depth > (opt?.limit ?? 10)) {
      throw error;
    }
    await wait(
      Math.min((opt?.base ?? 2) ** depth * (opt?.exp ?? 10), opt?.cap ?? 2000),
    );
    return callWithRetry(fn, opt, depth + 1);
  }
};

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

const getTodo = async (
  id: number,
  opt?: { signal?: AbortSignal },
): Promise<unknown> => {
  return callWithRetry(
    async () => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/todos/${id}`,
        { signal: opt?.signal },
      );
      return await res.json();
    },
    { limit: 10, cap: 2000, base: 2, exp: 10 },
  );
};

const getTodos = (
  ids: number[],
  opt?: { limit?: number; signal?: AbortSignal; logger?: Logger },
) => {
  const logger = opt?.logger ?? createLogger({ level: "info" });
  const limit = opt?.limit ?? 5;
  const controller = new AbortController();
  const remaining = ids
    .slice(0, ids.length)
    .map((id, index) => [id, index] as const)
    .reverse();
  const results: unknown[] = [];

  if (opt?.signal) {
    opt.signal.addEventListener("abort", () => {
      logger.warn("getTodos aborted by caller");
      controller.abort();
    });
  }

  return new Promise<unknown[]>((resolve, reject) => {
    const stopTimer = logger.timer("getTodos", { total: ids.length, limit });
    let pending = 0;
    logger.info("getTodos start", { remaining: remaining.length });

    for (let i = 0; i < limit; i++) {
      fetchRemaining();
    }

    function fetchRemaining() {
      if (remaining.length > 0) {
        const [idToFetch, originalIndex] = remaining.pop()!;
        pending++;
        logger.info("fetch todo", { id: idToFetch, pending });

        getTodo(idToFetch, { signal: controller.signal })
          .then((res) => {
            results[originalIndex] = res;
            pending--;
            fetchRemaining();
          })
          .catch((error) => {
            logger.error("fetch todo failed", error, { id: idToFetch });
            controller.abort();
            stopTimer(false, error, {
              fetched: results.filter((x) => x != null).length,
            });
            return reject(error);
          });
      } else if (pending === 0) {
        logger.info("getTodos completed", { count: results.length });
        stopTimer(true, undefined, { count: results.length });
        resolve(results);
      }
    }
  });
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [aborted, setAborted] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current = new AbortController();
    const controller = controllerRef.current;
    setAborted(false);
    setIsFetching(true);
    async function main() {
      try {
        const list = (await getTodos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
          logger,
          signal: controller.signal,
        })) as Todo[];
        setTodos(list);
        setIsFetching(false);
      } catch (error) {
        if (controller.signal.aborted) {
          setAborted(true);
          setIsFetching(false);
          return;
        }
        logger.error("getTodos failed in component", error);
        setIsFetching(false);
      }
    }
    main();
    return () => {
      controller?.abort();
      controllerRef.current = null;
    };
  }, []);

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1>Todos</h1>
      {aborted && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1 border rounded bg-yellow-100 text-yellow-800 shadow">
          getTodos has been aborted
        </div>
      )}
      <button
        className="fixed top-1/4 left-1/2 -translate-y-1/2 -translate-x-1/2 z-10 px-3 py-1 border rounded bg-white shadow text-black cursor-pointer h-28 w-56"
        disabled={!isFetching}
        onClick={() => {
          if (!isFetching) return;
          controllerRef.current?.abort();
          setAborted(true);
        }}
      >
        Abort getTodos
      </button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.id}. <span>{t.completed ? "[x]" : "[ ]"}</span>
            <span className="ml-3">{t.title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
