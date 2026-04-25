// utils/Microsoft/apiMicrosoftOrgUsers.js
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const getOrgUsers = () =>
    requestWithAuth('/microsoft/org-users');

export const importOrgUsers = (users) =>
    requestWithAuth('/microsoft/org-users/import', {
        method: 'POST',
        body: JSON.stringify({ users }),
    });
