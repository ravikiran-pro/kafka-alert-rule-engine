const kafka = require('kafka-node');
const pool = require('./db');

const user = new kafka.KafkaClient({
    kafkaHost: 'localhost:9092'
});

const Topic = 'trigger.public.leave'
const Rules = [
    {
      "table": "leave",
      "rule": [
        {
          "type": "AND",
          "records": [
            {
              "primary_key": "receiver_id",
              "foreign_table": "member",
              "foreign_key": "user_id"
            }
          ],
          "condition": [
            {
              "key_name": "member.type",
              "value": "lead"
            }
          ],
          "action_trigger": "notify_lead"
        }
      ],
      "action": [
        {
          "name": "notify_lead",
          "type": "create",
          "table": "notification",
          "schema": {
            "sender_id": "leave.sender_id",
            "receiver_id": "leave.receiver_id",
            "message": "Leave request from a team member",
            "start_date": new Date().toISOString().split('T')[0],
            "end_date": new Date().toISOString().split('T')[0]
          }
        }
      ]
    }
  ]
  

function produce() {
    const producer = new kafka.Producer(user);

    producer.on('ready', () => {
        const payload = [
            {
                topic: Topic,
                messages: 'Kakfa consumer intialized'
            }
        ];

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
// Configure Kafka consumer
const consumer = new kafka.Consumer(
    new kafka.KafkaClient({ kafkaHost: 'localhost:9092' }),
    [{ topic: Topic }]
);

function getNestedValue(obj, keys) {
    const keyArray = keys.split('.');
    return keyArray.reduce((acc, key) => acc && acc[key], obj);
}

async function getAllRecords(item, payload, base_table) {
    let recordsData = {[base_table]: payload};
  
    await Promise.all(
      item.records.map(async (queryObject) => {
        const query = `SELECT * FROM ${queryObject?.foreign_table} WHERE ${queryObject?.foreign_key} = ${payload[queryObject?.primary_key]}`;
        const data = await pool.query(query);
        recordsData[queryObject?.foreign_table] = data?.rows[0];
        console.log(`Retrieving record from ${queryObject.foreign_table} Successfully`)
      })
    );
  
    return recordsData;
}

function convertStringToSQLInsert(inputString) {
  // Assuming input is in the format: (3,2,Fever,2023-11-10,2023-11-10)
  const values = inputString
      .substring(1, inputString.length - 1) // Remove parentheses
      .split(',')
      .map(value => {
          value = value.trim();
          // Check if the value is a string and enclose it in single quotes
          if (isNaN(value)) {
              return `'${value}'`;
          }
          // Otherwise, keep the value as is
          return value;
      });

  return values.join(', ')
}

async function constructSchema(result, schema){
  let columns = [];
  let values = [];
  Object.keys(schema).forEach(key => {
    if(schema[key].includes('.')){
      columns.push(key)
      values.push(getNestedValue(result, schema[key]))
    }else{
      columns.push(key)
      values.push(schema[key])
    }
  })
  return { columns, values }
}

// Consume messages from Kafka broker
consumer.on('message', function (message) {
    try{
        let { payload } = JSON.parse(message.value);
        let base_table = payload.source.table;
        payload = payload?.after
        if(Object.keys(payload)){
            Rules.forEach(rule => {
                if(rule.table === base_table){
                    rule.rule.forEach(( async item => {
                        console.log(`Rule : ${item}`)
                        const result = await getAllRecords(item, payload, base_table);
                        let matchCount = 0;
                        item.condition.forEach(condition => {
                            let key_value = condition.key_name;
                            if(condition.key_name.includes('.')){
                                key_value = getNestedValue(result, condition.key_name)
                            }
                            if(key_value === condition.value){
                                matchCount++
                            }
                            if((item.type === 'OR' && matchCount > 0) || matchCount === item.condition.length){
                              rule.action.forEach(async actions => {
                                if(item.action_trigger === actions.name){
                                  console.log(`Action ${actions.name} Execution Started`)
                                  const {columns, values} = await constructSchema(result, actions.schema);
                                  if(actions.type === 'create'){
                                    const insertStatement = `INSERT INTO ${actions.table} (${columns.join(', ')}) VALUES (${convertStringToSQLInsert(`(${values.join(',')})`)})`;
                                    let status = await pool.query(insertStatement)
                                    if(status.rowCount === 1){
                                      console.log(`Action ${actions.name} Executed Successfully`)
                                    }
                                  }
                                }
                              })
                            }
                        })
                    }))


                    // "condition": [
                    //     {
                    //       "key_name": "member.type",
                    //       "value": "lead"
                    //     }
                    //   ],
                }
            })
        }
    }catch{
        console.log("Kafka Initiated")
    }
});
