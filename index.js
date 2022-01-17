
class MptTree {
	constructor(dbConfig){
		const {dialect} = dbConfig;
		this.db = MptTree.#requireDb(dialect)
		this.db.connect(dbConfig);
	}

	static #requireDb(dialect){
		let db = null;
		switch(dialect){
			case 'pgdb':
			default:
				db = require("./pgdb");
				break;
		}
		return db;
	}

	async init(){
		// await this.db.createTreeTable();
		// await this.createRootNode('team', 'topteam');
		// await this.insertNode('team', 'team2.1', 'team2');
		await this.deleteNode('team', 'team2.1');
		await this.tree('team');
	}

	async createRootNode(resourceType, resourceId){
		await this.db.createRootNode(resourceType, resourceId);
	}

	async insertNode(resourceType, resourceId, resourceParentId){
		await this.db.insertNode(resourceType, resourceId, resourceParentId);
	}

	async tree(resourceType){
		await this.db.tree(resourceType);
	}

	async deleteNode(resourceType, resourceId){
		await this.db.deleteNode(resourceType, resourceId)
	}
}

const dbConfig = {
	dialect: 'pgdb'
}

const mptTree = new MptTree(dbConfig);
mptTree.init();


module.exports = MptTree;

