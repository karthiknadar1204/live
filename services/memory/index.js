import MemoryClient from 'mem0ai';
const apiKey = process.env.MEM0_API_KEY;
const client = new MemoryClient({
    apiKey: apiKey,
    organizationId: 'your-organization-id-here',  // Optional
    projectId: 'your-project-id-here' // Optional
});
