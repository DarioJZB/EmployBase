import express from 'express';
import inquirer from 'inquirer';
import { pool, connectToDb } from './connection.js';

await connectToDb();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.urlencoded({ extended: false}));
app.use(express.json());

const employBase = {
    async menu() {
        const {choice} = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'What would you like to do?',
                choices: ['View All Employess', 'View Employees by Department', 'Add Employee', 'Update Employee Role', 'View All Roles', 'Add Role', 'View All Departments', 'Add Department', 'View Utilized Department Budget', 'Quit']
            }
        ]);

        switch (choice) {
            case 'View All Employess':
                await this.viewEmployees();
                break;
            case 'View Employees by Department':
                await this.viewEmployeesByDept();
                break;
            case 'Add Employee':
                await this.addEmployee();
                break;
            case 'Update Employee Role':
                await this.updateEmployee();
                break;
            case 'View All Roles':
                await this.viewRoles();
                break;
            case 'Add Role':
                await this.addRole();
                break;
            case 'View All Departments':
                await this.viewDepartments();
                break;
            case 'Add Department':
                this.addDepartment();
                break;
            case 'View Utilized Department Budget':
                this.viewBudget();
                break;
            case 'Quit':
                pool.end();
                process.exit(0);
        }
    },

    async viewEmployees() {
        const viewQuery = await pool.query(`
            SELECT a.id AS "Employee ID", 
                a.first_name AS "First Name", a.last_name AS "Last Name", 
                b.title AS "Job Title", c.name AS "Department", 
                b.salary AS "Salaries", CONCAT(d.first_name,' ', d.last_name) as "Manager"
            FROM employee a JOIN role b ON a.role_id = b.id
                JOIN department c ON b.department = c.id 
                LEFT JOIN employee d ON a.manager_id = d.id ORDER BY a.id ASC  
            `);
        console.table(viewQuery.rows);
        this.menu();
    },

    async viewEmployeesByDept () {
        const deptArr: any[] = [];
        const deptData = await pool.query(`
            SELECT * FROM department`);
        deptData.rows.forEach(item => {
            deptArr.push(item.name);
        })

        inquirer.prompt([
            {
                type: 'list',
                name: 'dept',
                message: 'Choose a department',
                choices: deptArr
            }
        ])
            .then(async (answer) =>{
                const dept = deptData.rows.find(managerId => managerId.name === answer.dept);
                const query = await pool.query(`
                    SELECT e.first_name AS "First Name", e.last_name, d.name AS "Department"
                    FROM employee e JOIN role r ON e.role_id = r.id JOIN department d on r.department = d.id
                    WHERE d.id = $1`, [dept.id]);
                console.table(query.rows);
                this.menu();
            })
    },

    async addEmployee() {
        const roleArr: any[] = [];
        const managerArr: any[] = [];
        const data = await pool.query(`
            SELECT r.id AS "roleId", r.title AS "role", 
                e.id AS "managerId", CONCAT(e.first_name, ' ', e.last_name) AS "manager" 
            FROM role r JOIN employee e ON r.id = e.role_id
            `);
        data.rows.forEach(item => {
            roleArr.push({roleId: item.roleId, role: item.role});
            managerArr.push({managerId: item.managerId, manager: item.manager});
        });
        managerArr.push({managerId: null, manager: 'None'})
        const roleList = roleArr.map(item => item.role);
        const managerList = managerArr.map(item => item.manager);

        inquirer.prompt([
            {
                type: 'input',
                name: 'first_name',
                message: 'What is the employee\'s first name?'
            },
            {
                type: 'input',
                name: 'last_name',
                message: 'What is the employee\'s last name?'
            },
            {
                type: 'list',
                name: 'role',
                message: 'What is the employee\'s role?',
                choices: roleList
            },
            {
                type: 'list',
                name: 'manager',
                message: 'Who is the employee\'s manager?',
                choices: managerList
            }
        ])
            .then((answer) => {
                const role = roleArr.find(roleIndex => roleIndex.role === answer.role);
                const manager = managerArr.find(managerIndex => managerIndex.manager === answer.manager);
                if (manager.managerId) {
                    pool.query(`
                        INSERT INTO employee (first_name, last_name, role_id, manager_id)
                        VALUES ($1, $2, $3, $4)`, [answer.first_name, answer.last_name, parseInt(role.roleId), parseInt(manager.managerId)])
                            .then(() => {
                                console.log(`Added ${answer.first_name} ${answer.last_name} to the database`);
                                this.menu();
                            })
                            .catch((err: any) => {
                                console.error(`Error adding ${answer.first_name} ${answer.last_name}:`, err);
                                this.menu();
                            })
                } else {
                    pool.query(`
                        INSERT INTO employee (first_name, last_name, role_id)
                        VALUES ($1, $2, $3)`, [answer.first_name, answer.last_name, parseInt(role.roleId)])
                            .then(() => {
                                console.log(`Added ${answer.first_name} ${answer.last_name} to the database`);
                                this.menu();
                            })
                            .catch((err: any) => {
                                console.error(`Error adding ${answer.first_name} ${answer.last_name}:`, err);
                                this.menu();
                            })
                }             
            })                        
    },

    async updateEmployee() {
        const roleArr: any[] = [];
        const employeeArr: any[] = [];
        const data = await pool.query(`
            SELECT r.id AS "roleId", r.title AS "role", 
                e.id AS "employeeId", CONCAT(e.first_name, ' ', e.last_name) AS "employee" 
            FROM role r JOIN employee e ON r.id = e.role_id
            `);
        data.rows.forEach(item => {
            roleArr.push({roleId: item.roleId, role: item.role});
            employeeArr.push({employeeId: item.employeeId, employee: item.employee});
        });
        const roleList = roleArr.map(item => item.role);
        const employeeList = employeeArr.map(item => item.employee);
        inquirer.prompt([
            {
                type: 'list',
                name: 'employee',
                message: ' Which employee\'s role do you want to update?',
                choices: employeeList
            },
            {
                type: 'list',
                name: 'role',
                message: 'Which role do you want to assign the selected employee?',
                choices: roleList   
            }
        ])
            .then((answer) => {
                const roleTemp = roleArr.find(roleName => roleName.role === answer.role);
                const employeeTemp = employeeArr.find(employee => employee.employee === answer.employee);
                pool.query(`
                    UPDATE employee SET role_id = $1 WHERE id = $2`, [parseInt(roleTemp.roleId), parseInt(employeeTemp.employeeId)])
                        .then(() => {
                            console.log(`${answer.employee}'s role has been updated`);
                            this.menu();
                        })
                        .catch((err: any) => {
                            console.error(`Error updating ${answer.employee}'s role:`, err);
                            this.menu();
                        })
                this.menu();
            })
    },

    async viewRoles() {
        const viewQuery = await pool.query(`
            SELECT a.id AS "Role ID", a.title AS "Job Title",  
                b.name AS "Department", a.salary AS "Salary"
            FROM role a JOIN department b ON a.department = b.id ORDER BY a.id ASC
            `);
        console.table(viewQuery.rows);
        this.menu();
    },

    async addRole() {
        const deptList = await pool.query(`
            SELECT * FROM department
            `);
        const deptListArr = deptList.rows.map(dept => dept.name);
        inquirer.prompt([
            {
                type: 'input',
                name: 'title',
                message: 'What is the name of the role?'
            },
            {
                type: 'input',
                name: 'salary',
                message: 'What is the salary of the role?' 
            },
            {
                type: 'list',
                name: 'department',
                message: 'Which department does the role belong to?',
                choices: deptListArr
            }
        ])
            .then((answer) => {
                const deptId = deptList.rows.find(dept => dept.name === answer.department);
                pool.query(`
                    INSERT INTO role (title, salary, department)
                    VALUES ($1, $2, $3)`, [answer.title, parseInt(answer.salary), parseInt(deptId.id)])
                        .then(() => {
                            console.log(`The ${answer.title} Role has been added`);
                            this.menu();
                        })
                        .catch((err: any) => {
                            console.error(`Error adding role ${answer.title}:`, err);
                            this.menu();
                        })
            })
    },

    async viewDepartments() {
        const viewQuery = await pool.query(`
            SELECT id AS "Department ID", name AS "Department Name" FROM department ORDER BY name
            `);
        console.table(viewQuery.rows);
        this.menu();
    },

    addDepartment() {
        inquirer.prompt([{
            type: 'input',
            name: 'department',
            message: 'Enter name of new Department',
        }])
            .then((answer) => {
                pool.query(`
                    INSERT INTO department (name) VALUES ($1)`, [answer.department])
                    .then(() => {
                        console.log(`The ${answer.department} Department has been added`);
                        this.menu();
                    })
                    .catch((err: any) => {
                        console.error(`Error adding department ${answer.department}:`, err);
                        this.menu();
                    })
            })
    },

    async viewBudget () {
        const deptArr: any[] = [];
        const deptData = await pool.query(`
            SELECT * FROM department`);
        deptData.rows.forEach(item => {
            deptArr.push(item.name);
        })

        inquirer.prompt([
            {
                type: 'list',
                name: 'dept',
                message: 'Choose a department to view its ultilized budget',
                choices: deptArr
            }
        ])
            .then(async (answer) =>{
                const dept = deptData.rows.find(managerId => managerId.name === answer.dept);
                const query = await pool.query(`
                    SELECT SUM(r.salary) AS "Utilized Budget"
                    FROM employee e JOIN role r ON e.role_id = r.id 
                    WHERE r.id = $1`, [dept.id]);
                console.table(query.rows);
                this.menu();
            })
    }
}

app.use((_req, res) => {
    res.status(404).end();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

employBase.menu();