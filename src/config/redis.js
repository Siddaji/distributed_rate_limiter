import {createClient} from 'redis';

const redisclient = createClient({
    url : "redis://localhost:6379"
})

redisclient.on('error', (error) =>{
    console.error('Redis Client Error', error);
});

try{
    await redisclient.connect();

    console.log('Redis client connected successfully');

}catch(error){
    console.error('Redis Client Connection Error', error.Message);
}

export default redisclient;