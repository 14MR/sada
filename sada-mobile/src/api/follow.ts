import client from './client';

export const FollowService = {
    followUser: async (userId: string) => {
        const response = await client.post(`/follow/${userId}`);
        return response.data;
    },

    unfollowUser: async (userId: string) => {
        const response = await client.delete(`/follow/${userId}`);
        return response.data;
    },

    getFollowers: async (userId: string) => {
        const response = await client.get(`/follow/${userId}/followers`);
        return response.data;
    },

    getFollowing: async (userId: string) => {
        const response = await client.get(`/follow/${userId}/following`);
        return response.data;
    }
};
