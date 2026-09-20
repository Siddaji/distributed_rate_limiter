import {createClient} from 'redis';

const redisclient = createClient({
    url : process.env.REDIS_URL || "redis://localhost:6379"
})

redisclient.on('error', (error) =>{
    console.error('Redis Client Error', error.message);
});

try{
    await redisclient.connect();

    console.log('Redis client connected successfully');

}catch(error){
    console.error('Redis Client Connection Error', error.message);
}

export default redisclient;