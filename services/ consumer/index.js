const kafka = require('kafka-node');

const user = new kafka.KafkaClient({
    kafkaHost: 'localhost:9092'
});


const Topics = ['trigger.public.leave', 'trigger.public.leave_status', 'trigger.public.notification']; // Add your topics here

function produce() {
    const producer = new kafka.Producer(user);

    producer.on('ready', () => {
        const payload = Topics.map(topic => ({
            topic: topic,
            messages: ['Kafka consumer initialized for ' + topic] // Messages should be an array
        }));

        producer.send(payload, (error, data) => {
            if (error) {
                console.error('Error in publishing message:', error);
            } else {
                console.log('Message successfully published:', data);
            }
        });
        producer.on('error', (error) => {
            console.error('Error connecting to Kafka:', error);
        });
    });
}

produce()

const consumer = new kafka.Consumer(
    new kafka.KafkaClient({ kafkaHost: 'localhost:9092' }),
    Topics.map(topic => ({ topic }))
);


module.exports = consumer;