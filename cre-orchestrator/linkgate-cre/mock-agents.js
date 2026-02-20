const express = require('express');

const app = express();
const port = 3000;

app.get('/agent1', (req, res) => {
    console.log(`[Mock Agent 1] Received task ${req.query.taskId}`);
    res.json({
        result: 'Success: Team A won 2-1',
        signature: '0xmockagent1'
    });
});

app.get('/agent2', (req, res) => {
    console.log(`[Mock Agent 2] Received task ${req.query.taskId}`);
    res.json({
        result: 'Success: Team A won 2-1',
        signature: '0xmockagent2'
    });
});

app.get('/agent3', (req, res) => {
    console.log(`[Mock Agent 3] Received task ${req.query.taskId}`);
    // Simulate one agent disagreeing or failing just for variance (let's make it agree for a pass)
    res.json({
        result: 'Success: Team A won 2-1',
        signature: '0xmockagent3'
    });
});

app.listen(port, () => {
    console.log(`Mock Agents listening on port ${port}`);
});
