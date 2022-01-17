const { Pool } = require('pg');
let POOL = null;
const TABLE = 'public.mpt_tree';

const connect = () => {
    const username = 'postgres';
    const password = 'postgres';
    const host = 'localhost';
    const port = '5432';
    const dbname = 'postgres';

    const connectionString = `postgres://${username}:${password}@${host}:${port}/${dbname}`;
    if (!POOL) {
        console.log('DB connection creating...');
        POOL = new Pool({
            connectionString,
            max: 100,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 60000
        });
    }
    console.log('DB connection created.');
    return POOL;
}

const createTreeTable = async () => {
    const client = await POOL.connect();
    await client.query('BEGIN');
    const result = await client.query(`
        CREATE TABLE IF NOT EXISTS public.mpt_tree (
            id SERIAL,
            tree_resource_type VARCHAR(255) NOT NULL,
            tree_resource_id VARCHAR(255) NOT NULL,
            lft NUMERIC NOT NULL,
            rgt NUMERIC NOT NULL,
            lvl NUMERIC NOT NULL,
            created_date_time TIMESTAMP NOT NULL,
            updated_date_time TIMESTAMP NOT NULL
        )
    `)
    await client.query('COMMIT');
}

const createRootNode = async (resourceType, resourceId) => {
    const client = await POOL.connect();
    await client.query('BEGIN');
    const q = `
        INSERT INTO ${TABLE} (tree_resource_type, tree_resource_id, lft, rgt, lvl, created_date_time, updated_date_time)
        VALUES('${resourceType}', '${resourceId}', 1, 2, 0, NOW(), NOW())
    `;
    console.log(q);
    const result = await client.query(q);
    console.log(result);
    await client.query('COMMIT');
}

const insertNode = async (resourceType, resourceId, resourceParentId) => {
    const client = await POOL.connect();
    try {
        await client.query('BEGIN');

        const selectQ = `
        SELECT * FROM ${TABLE} WHERE tree_resource_type = '${resourceType}' and tree_resource_id = '${resourceParentId}'
    `;

        console.log(selectQ);
        const parentNode = (await client.query(selectQ)).rows[0];
        console.log(parentNode);


        const udpateQ = `
            UPDATE ${TABLE} SET lft = lft+2, updated_date_time = NOw() WHERE tree_resource_type = '${resourceType}' and lft > ${parentNode.rgt};
            UPDATE ${TABLE} SET rgt = rgt+2, updated_date_time = NOw() WHERE tree_resource_type = '${resourceType}' and rgt >= ${parentNode.rgt}; 
        `;

        const insQ = `
            INSERT INTO ${TABLE} (tree_resource_type, tree_resource_id, lft, rgt, lvl, created_date_time, updated_date_time)
            VALUES('${resourceType}', '${resourceId}', ${parentNode.rgt}, ${parseInt(parentNode.rgt) + 1}, ${parseInt(parentNode.lvl) + 1}, NOW(), NOW())
        `;

        console.log(udpateQ);
        const updated = await client.query(udpateQ);
        console.log(updated);

        console.log(insQ);
        const result = await client.query(insQ);
        console.log(result);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.log(err);
    }finally{
        client.release();
    }
}


const tree = async (resourceType) => {
    const client = await POOL.connect();
    try {
        await client.query('BEGIN');

        const selectQ = `
            SELECT * FROM ${TABLE} WHERE tree_resource_type = '${resourceType}'
            ORDER by lft
        `;

        console.log(selectQ);
        const results = (await client.query(selectQ)).rows;
        for(team of results){
            let teamName = '';
            for(let i = 0; i < team.lvl; i++){
                teamName+='--';
            }
            teamName+=team.tree_resource_id;
            console.log(teamName);
        }
    }catch(err){
        console.log(err);

    }
}

const isLeafNode = (node) => {
    console.log(node);
    return parseInt(node.rgt) == parseInt(node.lft)+1;
}

const deleteNode = async (resourceType, resourceId) => {
    const client = await POOL.connect();
    try{
        await client.query('BEGIN');
        
        const selectQ = `SELECT * FROM ${TABLE} WHERE tree_resource_type = '${resourceType}' and tree_resource_id = '${resourceId}'`;
        const node = (await client.query(selectQ)).rows[0];
        if(!isLeafNode(node)) throw 'Not a leaf node';
        
        const deleteQ= `DELETE FROM ${TABLE} WHERE tree_resource_type = '${resourceType}' and tree_resource_id = '${resourceId}';`;
        await client.query(deleteQ);

        const updateQ = `
            UPDATE ${TABLE} SET lft = lft-2, updated_date_time = NOw() WHERE tree_resource_type = '${resourceType}' and lft > ${node.rgt};
            UPDATE ${TABLE} SET rgt = rgt-2, updated_date_time = NOw() WHERE tree_resource_type = '${resourceType}' and rgt > ${node.rgt};    
        `;
        await client.query(updateQ);
        
        await client.query('COMMIT');
        return node;
    }catch(err){
        await client.query('ROLLBACK');
        console.log(err);
    }finally{
        client.release();
    }
}


module.exports = {
    connect,
    createTreeTable,
    createRootNode,
    insertNode,
    tree,
    deleteNode
}