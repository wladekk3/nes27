export const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};
