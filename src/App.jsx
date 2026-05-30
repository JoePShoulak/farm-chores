import { useEffect, useState } from "react";

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/chores")
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data?.error || "Could not load chores.");
        }

        setTodos(data);
      })
      .catch(() => setError("Could not load chores."));
  }, []);

  async function addTodo(event) {
    event.preventDefault();

    const text = newTodo.trim();
    if (!text) return;

    const response = await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const todo = await response.json();

    if (response.ok) {
      setTodos([...todos, todo]);
      setNewTodo("");
      setError("");
    } else {
      setError(todo.error || "Could not add chore.");
    }
  }

  async function deleteTodo(id) {
    const response = await fetch(`/api/chores/${id}`, { method: "DELETE" });

    if (response.ok) {
      setTodos(todos.filter((todo) => todo.id !== id));
      setError("");
    } else {
      setError("Could not delete chore.");
    }
  }

  async function toggleTodo(todo) {
    const response = await fetch(`/api/chores/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    const updatedTodo = await response.json();

    if (response.ok) {
      setTodos(todos.map((item) => (item.id === todo.id ? updatedTodo : item)));
      setError("");
    } else {
      setError(updatedTodo.error || "Could not update chore.");
    }
  }

  function startEditing(todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  async function saveEditing(id) {
    const text = editingText.trim();
    if (!text) return;

    const response = await fetch(`/api/chores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const updatedTodo = await response.json();

    if (response.ok) {
      setTodos(todos.map((todo) => (todo.id === id ? updatedTodo : todo)));
      setEditingId(null);
      setEditingText("");
      setError("");
    } else {
      setError(updatedTodo.error || "Could not update chore.");
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Farm</p>
          <h1>Farm Chores</h1>
        </div>
      </header>

      <section className="panel">
        <div className="card-title-row">
          <h2>Chores</h2>
        </div>

        <form className="todo-form" onSubmit={addTodo}>
          <input
            aria-label="New chore"
            placeholder="Add a chore"
            value={newTodo}
            onChange={(event) => setNewTodo(event.target.value)}
          />
          <button type="submit">Add</button>
        </form>

        {error ? <p className="action-error">{error}</p> : null}

        {todos.length === 0 ? (
          <p className="empty-state">No chores yet.</p>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
              <li className="todo-item" key={todo.id}>
                <input
                  aria-label={`Mark ${todo.text} done`}
                  checked={todo.done}
                  onChange={() => toggleTodo(todo)}
                  type="checkbox"
                />

                {editingId === todo.id ? (
                  <input
                    aria-label="Edit chore"
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                  />
                ) : (
                  <span className={todo.done ? "todo-text done" : "todo-text"}>
                    {todo.text}
                  </span>
                )}

                <div className="todo-actions">
                  {editingId === todo.id ? (
                    <>
                      <button type="button" onClick={() => saveEditing(todo.id)}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEditing(todo)}>
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => deleteTodo(todo.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
