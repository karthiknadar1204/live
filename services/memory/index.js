import MemoryClient from 'mem0ai';
const apiKey = process.env.MEM0_API_KEY;
const client = new MemoryClient({
  apiKey: apiKey,
  organizationId: "org_IFWKkGKSAH83pVKabeMudquFhVntUwQaXMLuUyVE", // Optional
  projectId: "proj_voW8fTORR59Jqkd2A0CHVGYVGQThdZrHANRy3BC7", // Optional
});

