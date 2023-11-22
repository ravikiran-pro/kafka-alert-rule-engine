const pool = require('../../db');


const Rules = [
  {
    "ruleId": "1",
    "name": "notify_trigger",
    "table": "leave",
    "rule": {
      "all": [
        {
          "and": [
            {
              "type": "relational",
              "column": "sender_id",
              "foreign_table": "member",
              "foreign_key": "user_id",
              "relational-column": "type",
              "value": "employee"
            },
            {
              "type": "relational",
              "column": "receiver_id",
              "foreign_table": "member",
              "foreign_key": "user_id",
              "relational-column": "type",
              "value": "lead",
              "compare": "equal"
            },
            {
              "column": "status",
              "value": "pending",
              "compare": "equal"
            },
          ]
        },
        {
          "or": [
            {
              "type": "relational",
              "column": "sender_id",
              "foreign_table": "member",
              "foreign_key": "user_id",
              "relational-column": "available_leaves",
              "value": "0",
              "compare": "greater"
            }
          ]
        }
      ]
    },
    "actions": {
      "success": [
        {
          "name": "notify_lead",
          "type": "create",
          "table": "notification",
          "columns": [
            { name: "sender_id", value: "sender_id" , type: 'base_table'},
            { name: "receiver_id", value: "receiver_id" , type: 'base_table' },
            { name: "message", value: "Leave request from a team member" , type: 'default' },
            { name: "start_date", value: new Date().toISOString().split('T')[0] , type: 'default'},
            { name: "end_date", value: new Date().toISOString().split('T')[0] , type: 'default'}
          ]
        }
      ],
      "failure": null
    }
  },
  {
    "ruleId": "2",
    "name": "notify_approve",
    "table": "notification",
    "rule": {
      "all": [
        {
          "and": [
            {
              "column": "status",
              "value": "approve",
              "compare": "equal"
            },
            {
              "type": "relational",
              "column": "receiver_id",
              "foreign_table": "member",
              "foreign_key": "user_id",
              "relational-column": "type",
              "value": "lead",
              "compare": "equal"
            }
          ]
        },
        {
          "or": [
            {
              "type": "relational",
              "column": "sender_id",
              "foreign_table": "member",
              "foreign_key": "user_id",
              "relational-column": "available_leaves",
              "value": "0",
              "compare": "greater"
            }
          ]
        }
      ]
    },
    "actions": {
      "success": [
        {
          "name": "notify_lead",
          "type": "delete",
          "table": "notification",
          where: [
            {
              "name": "sender_id",
              "operator": "=",
              "value": "sender_id"
            }
          ],
        },
        {
          "name": "notify_lead",
          "type": "update",
          "table": "leave",
          "columns": [
            { name: "status", value: "status" },
          ],
          where: [
            {
              "name": "sender_id",
              "operator": "=",
              "value": "sender_id"
            }
          ],
        }
      ],
      "failure": null
    }
  }
]

function getNestedValue(obj, keys) {
  const keyArray = keys.split('.');
  return keyArray.reduce((acc, key) => acc && acc[key], obj);
}

async function getAllRecords(item, payload, base_table) {
  let recordsData = { [base_table]: payload };

  await Promise.all(
    item.records.map(async (queryObject) => {
      const query = `SELECT *,id FROM ${queryObject?.foreign_table} WHERE ${queryObject?.foreign_key} = ${item?.value || payload[queryObject?.primary_key]}`;
      const data = await pool.query(query);
      recordsData[queryObject?.foreign_table] = data?.rows[0];
      console.log(`Retrieving record from ${queryObject.foreign_table} Successfully`)
    })
  );

  return recordsData;
}

async function getRecord(queryObject, payload, base_table) {
  let recordsData = { [base_table]: payload };

  const query = `SELECT * FROM ${queryObject?.foreign_table} WHERE ${queryObject?.foreign_key} = ${payload[queryObject?.column]}`;
  const data = await pool.query(query);
  recordsData[queryObject?.foreign_table] = data?.rows[0];

  return recordsData;
}

function convertValue(value) {
  // value = value.trim();
  // Check if the value is a string and enclose it in single quotes
  if (isNaN(value)) {
    return `'${value}'`;
  }
  return value
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

async function constructSchema(result, schema, where) {
  let columns = [];
  let values = [];
  schema?.map(item => {
    let value = ''
    columns.push(item.name);
    item.type === 'default' ? value = item.value : value = result?.[item.value]
    values.push(convertValue(value));
  })
  let whereClause = '';
  if (where && where.length > 0) {
    whereClause = where.map(condition => `${condition.name} ${condition.operator} ${convertValue(result[condition.value])}`).join(' AND ');
  }

  return { columns, values, whereClause };
}

async function actionExecutor(records, actions) {
  try {
    const { columns, values, whereClause } = await constructSchema(records, actions?.columns, actions?.where);

    let query = '', status = null
    switch (actions.type) {
      case 'create':
        query = `INSERT INTO ${actions.table} (${columns.join(', ')}) VALUES (${values.join(',')});`;
        status = await pool.query(query)
        break

      case 'update':
        query = `UPDATE ${actions.table} SET ${columns.map((col, index) => `${col} = ${values[index]}`).join(', ')} WHERE ${whereClause};`;
        status = await pool.query(query);
        break

      case 'delete':
        query = `DELETE FROM ${actions.table} WHERE ${whereClause};`;
        status = await pool.query(query);
        break

      default:
        console.log(`Unsupported action type: ${actions.type}`);
        return false;
    }

    console.log(`${actions.type} table ${actions.table} successfully`);
    return status.rowCount > 0;
  }
  catch {
    console.log(`Action Execution failed -- cannot ${actions.type} data`)
  }
}


async function ruleTracking(rule, payload) {
  const baseTable = payload.source.table;
  const payloadAfter = payload?.after;
  let joinTables = [], joins = [], selectQuery = [];

  if (rule.table === baseTable) {
    const ruleItems = rule?.rule?.all;
    ruleItems.forEach(item => {
      const conditions = item.and || item.or;
      const logicalOperator = item.and ? 'AND' : 'OR';

      conditions.forEach(condition => {
        if (condition.type === 'relational') {
          let isMatch = false, count = 1, select = "";
          for (let i = joinTables.length - 1; i >= 0; i--) {
            const match = joinTables[i];

            if (!match.isDuplicate && match.foreign_table === condition.foreign_table && count === 1) {
              count = match.count + 1;
            }

            if (match.foreign_table === condition.foreign_table &&
              match.foreign_key === condition.foreign_key &&
              match.value === payloadAfter[condition.column]) {
              joinTables.push({
                foreign_table: condition.foreign_table,
                foreign_key: condition.foreign_key,
                value: payloadAfter[condition.column],
                count: match.count,
                isDuplicate: true,
              });
              condition.count = match.count
              select = `${condition.foreign_table}${match.count}.${condition?.['relational-column']} as ${condition.foreign_table}${match.count}_${condition?.['relational-column']}`;
              isMatch = true;
              break;
            }
          }

          if (!isMatch) {
            joinTables.push({
              foreign_table: condition.foreign_table,
              foreign_key: condition.foreign_key,
              value: payloadAfter[condition.column],
              count: count,
            });
            condition.count = count
            select = `${condition.foreign_table}${count}.${condition?.['relational-column']} as ${condition.foreign_table}${count}_${condition?.['relational-column']}`
            joins.push(`inner join public.${condition?.foreign_table} as ${condition?.foreign_table + count} on ${condition?.foreign_table + count}.${condition?.foreign_key} = ${baseTable}.${condition?.column}`)
          }

          if (!selectQuery.includes(select)) selectQuery.push(select)
        }
      });
    });
  }
  return { joinTables, joins, selectQuery };
}

async function conditionsTracking(rule, records, payload) {
  let conditions = '', isError = false;
  const ruleItems = rule?.rule?.all;
  ruleItems.forEach(item => {
    if (isError === true) return;
    const conditions = item.and || item.or;
    const logicalOperator = item.and ? 'AND' : 'OR';
    let matchCount = 0;
    conditions.forEach(condition => {
      if (isError === true) return;
      let arr = [];
      let compare = condition.type === 'relational' ? records : payload?.after;
      let key_name = condition.type === 'relational' ? `${condition?.foreign_table}${condition.count}_${condition?.['relational-column']}` : condition.column;
      switch (condition.compare) {
        case 'greater':
          compare[key_name] > condition.value ? matchCount++ : null
          break;
        case 'lesser':
          compare[key_name] < condition.value ? matchCount++ : null
          break;
        case 'equal':
          compare[key_name] === condition.value ? matchCount++ : null
          break;
        default:
          compare[key_name] === condition.value ? matchCount++ : null
          break;
      }
    });
    if ((logicalOperator === 'OR' && matchCount === 0) || matchCount !== conditions.length) {
      isError = true
    }
  });
  return !isError
}

async function ExecuteRule(message) {
  try {
    const { payload } = JSON.parse(message.value);
    const payloadAfter = payload?.after;

    if (payloadAfter && Object.keys(payloadAfter).length > 0) {
      Rules.forEach(async rule => {
        const { joins, selectQuery } = await ruleTracking(rule, payload);
        if (joins && joins?.length) {
          let filter = [];

          ///// Create query and fetch data
          Object.keys(payload?.after).map(item => {
            if (!item.includes('date')) filter.push(`${rule.table}.${item} = ${convertValue(payload.after[item])}`)
          })
          const query = `Select *,${selectQuery.join(',')} from ${rule.table}
            ${joins.join('\n')}
            where ${filter.join(' And ')};`;

          let { rows: records } = await pool.query(query);
          if (records && records.length) {
            let isMatch = await conditionsTracking(rule, records[0], payload);
            if (isMatch) {
              rule.actions.success.forEach(actions => actionExecutor(records[0], actions));
            } else {
              console.log('Rules Execution Failed -- Condition failure')
            }
          } else {
            console.log('Rules Execution Failed -- Cannot construct query')
          }
        }
      });
    }
  } catch (error) {
    console.log(message)
  }
}


module.exports = { ExecuteRule };
