"use client";

import { useEffect, useState } from "react";

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
  opt?: { limit?: number; signal?: AbortSignal },
) => {
  const limit = opt?.limit ?? 5;
  const controller = new AbortController();
  const remaining = ids
    .slice(0, ids.length)
    .map((id, index) => [id, index] as const)
    .reverse();
  const results: unknown[] = [];
  if (opt?.signal) {
    opt.signal.addEventListener("abort", () => {
      controller.abort();
    });
  }
  return new Promise<unknown[]>((resolve, reject) => {
    let pending = 0;
    for (let i = 0; i < limit; i++) {
      fetchRemaining();
    }
    function fetchRemaining() {
      if (remaining.length > 0) {
        const [remainingToFetchId, remainingToFetchIdx] = remaining.pop()!;
        pending++;
        getTodo(remainingToFetchId, { signal: controller.signal })
          .then((res) => {
            results[remainingToFetchIdx] = res;
            pending--;
            fetchRemaining();
          })
          .catch((err) => {
            controller.abort();
            return reject(err);
          });
      } else if (pending === 0) {
        resolve(results);
      }
    }
  });
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function main() {
      const list = (await getTodos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) as Todo[];
      setTodos(list);
      for (const todo of list) {
        console.log(`Got a todo: ${JSON.stringify(todo)}`);
      }
    }
    main();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1>Todos</h1>
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
