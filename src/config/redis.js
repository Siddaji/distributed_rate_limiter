import {createClient} from 'redis';

const redisclient = createClient({
    url : "redis://localhost:6379"
})

redisclient.on('error', (error) =>{
    console.error('Redis Client Error', error);
});

await redisclient.connect();

console.log('Redis client connected successfully');

export default redisclient;