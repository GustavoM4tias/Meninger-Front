// utils/Microsoft/apiPlanner.js
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const B = (body) => ({ method: 'POST',   body: JSON.stringify(body) });
const P = (body) => ({ method: 'PATCH',  body: JSON.stringify(body) });
const D = (body) => ({ method: 'DELETE', body: JSON.stringify(body) });

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups     = ()              => requestWithAuth('/microsoft/planner/groups');
export const getGroupPlans = (groupId)       => requestWithAuth(`/microsoft/planner/groups/${groupId}/plans`);

// ── Plans ─────────────────────────────────────────────────────────────────────
export const getPlanFull   = (planId)        => requestWithAuth(`/microsoft/planner/plans/${planId}/full`);
export const createPlan    = (groupId, title)=> requestWithAuth('/microsoft/planner/plans', B({ groupId, title }));
export const updatePlan    = (planId, data)  => requestWithAuth(`/microsoft/planner/plans/${planId}`,  P(data));
export const deletePlan    = (planId, etag)  => requestWithAuth(`/microsoft/planner/plans/${planId}`,  D({ etag }));

// ── Buckets ───────────────────────────────────────────────────────────────────
export const createBucket  = (data)          => requestWithAuth('/microsoft/planner/buckets',              B(data));
export const updateBucket  = (bucketId, data)=> requestWithAuth(`/microsoft/planner/buckets/${bucketId}`,  P(data));
export const deleteBucket  = (bucketId, etag)=> requestWithAuth(`/microsoft/planner/buckets/${bucketId}`,  D({ etag }));

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const createTask        = (data)          => requestWithAuth('/microsoft/planner/tasks',                    B(data));
export const updateTask        = (taskId, data)  => requestWithAuth(`/microsoft/planner/tasks/${taskId}`,          P(data));
export const deleteTask        = (taskId, etag)  => requestWithAuth(`/microsoft/planner/tasks/${taskId}`,          D({ etag }));
export const getTaskDetails    = (taskId)        => requestWithAuth(`/microsoft/planner/tasks/${taskId}/details`);
export const updateTaskDetails = (taskId, data)  => requestWithAuth(`/microsoft/planner/tasks/${taskId}/details`,  P(data));
