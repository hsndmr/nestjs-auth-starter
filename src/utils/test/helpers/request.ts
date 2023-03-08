import request from 'supertest';

export const authenticatedRequest = (app, token: string) => {
  const agent = request.agent(app);
  return {
    get: (url) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => agent.post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => agent.put(url).set('Authorization', `Bearer ${token}`),
    del: (url) => agent.del(url).set('Authorization', `Bearer ${token}`),
  };
};
