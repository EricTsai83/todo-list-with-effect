"use client";

import { useEffect, useState } from "react";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

const getTodo = async (id: number): Promise<unknown> => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  return await res.json();
};

// const getTodos = async (ids: number[]) => {
//   const chunkSize = 5;
//   const todos: unknown[] = [];
//   for (let i = 0; i < ids.length; i += chunkSize) {
//     const chunk = ids.slice(i, i + chunkSize);
//     const chunkTodos = await Promise.all(chunk.map(getTodo));
//     todos.push(...chunkTodos);
//   }
//   return todos;
// };

const getTodos = (ids: number[], limit = 5) => {
  const remaining = ids
    .slice(0, ids.length) // ids 的淺拷貝
    .map((id, index) => [id, index] as const) // 例如輸入 [101, 102, 103] → [[101,0],[102,1],[103,2]]
    .reverse(); // 為了方便後續用 pop() 拿出剩下的任務

  const results: unknown[] = []; // 用來存放 fetch 回來的資料，index 會對應到原來的 ids index
  return new Promise<unknown[]>((resolve, reject) => {
    // 起始並行請求
    let pending = 0; //  記錄目前正在執行的請求數量
    for (let i = 0; i < limit; i++) {
      fetchRemaining(); // 一開始會同時啟動 limit 個請求
    }

    function fetchRemaining() {
      if (remaining.length > 0) {
        const [remainingToFetchId, remainingToFetchIdx] = remaining.pop()!; // 拿出第一個任務，並從 remaining 中移除
        pending++; // 正在執行的請求數量 + 1
        getTodo(remainingToFetchId)
          .then((res) => {
            results[remainingToFetchIdx] = res; // 確保結果按照 ids 原始順序存放在 results。JavaScript 陣列允許「先放後面，再補前面」，即便 results[0] 還是 undefined，也不會影響後續再補上。
            pending--;
            fetchRemaining();
          })
          .catch((err) => reject(err)); // 如果有一個請求失敗，就 reject 整個 Promise
      } else if (pending === 0) {
        resolve(results); // 全部完成後 resolve(results)
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
