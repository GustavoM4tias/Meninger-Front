// utils/Microsoft/apiTodo.js
// Cliente do módulo To Do (Microsoft) — espelha as rotas /api/microsoft/todo.
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const B = (body) => ({ method: 'POST',  body: JSON.stringify(body) });
const P = (body) => ({ method: 'PATCH', body: JSON.stringify(body) });
const DEL = ()   => ({ method: 'DELETE' });

// ── Agregado "Minhas Tarefas" (todas as listas) ─────────────────────────────────
export const getMyTasks = () => requestWithAuth('/microsoft/todo/my');

// ── Listas ──────────────────────────────────────────────────────────────────────
export const getLists   = ()                    => requestWithAuth('/microsoft/todo/lists');
export const createList  = (displayName)         => requestWithAuth('/microsoft/todo/lists', B({ displayName }));
export const updateList  = (listId, displayName) => requestWithAuth(`/microsoft/todo/lists/${listId}`, P({ displayName }));
export const deleteList  = (listId)              => requestWithAuth(`/microsoft/todo/lists/${listId}`, DEL());

// ── Tarefas ───────────────────────────────────────────────────────────────────────
export const getTasks     = (listId)             => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks`);
export const getTask      = (listId, taskId)     => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}`);
export const createTask   = (listId, data)       => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks`, B(data));
export const updateTask   = (listId, taskId, d)  => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}`, P(d));
export const completeTask = (listId, taskId, c)  => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/complete`, B({ completed: c }));
export const deleteTask   = (listId, taskId)     => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}`, DEL());

// ── Etapas (subtarefas) ─────────────────────────────────────────────────────────
export const createStep = (listId, taskId, displayName)   => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/steps`, B({ displayName }));
export const updateStep = (listId, taskId, stepId, data)  => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/steps/${stepId}`, P(data));
export const deleteStep = (listId, taskId, stepId)        => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/steps/${stepId}`, DEL());

// ── Anexos (URL / arquivo / SharePoint) ─────────────────────────────────────────
export const addLink    = (listId, taskId, data)   => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/links`, B(data));
export const deleteLink  = (listId, taskId, linkId) => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/links/${linkId}`, DEL());

// ── Reuniões / Teams ──────────────────────────────────────────────────────────────
export const availableMeetings = (days = 14)          => requestWithAuth(`/microsoft/todo/meetings/available?days=${days}`);
export const createMeeting     = (listId, taskId, d)  => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/meeting`, B(d));
export const linkMeeting       = (listId, taskId, d)  => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/meeting/link`, B(d));
export const unlinkMeeting     = (listId, taskId)     => requestWithAuth(`/microsoft/todo/lists/${listId}/tasks/${taskId}/meeting`, DEL());
