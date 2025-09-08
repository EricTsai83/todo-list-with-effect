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

const getTodos = async (ids: number[]) => {
  const todos: unknown[] = [];
  for (const id of ids) {
    todos.push(await getTodo(id));
  }
  return todos;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function main() {
      const list = (await getTodos([1, 2, 3, 4, 5])) as Todo[];
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
            <span>{t.completed ? "[x]" : "[ ]"}</span>
            <span className="ml-3">{t.title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
