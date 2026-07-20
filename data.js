// SQL Quest — curriculum content and sample database schemas.
// Loaded as a plain script before app.js. Edit lessons here.

const curriculum = [
  {
    day: 1, title: "The Basics", lessons: [
      { id:"1.1", title:"What is SQL?", concept:"Introduction",
        theory:`<p>SQL (Structured Query Language) is how you talk to databases. Think of a database as a giant spreadsheet. SQL lets you ask questions like <code>SELECT</code> data, filter it, sort it, and modify it.</p><p>Every company that stores data uses SQL — from startups to Netflix. It's the universal language of data.</p>`,
        chips:[{t:"SELECT",c:"chip-blue"},{t:"FROM",c:"chip-blue"},{t:"*",c:"chip-cyan"}],
        task:"Select all columns from the employees table to see what data we have.",
        starter:"-- Select everything from the employees table\nSELECT * FROM employees;",
        solution:["select * from employees"],
        hint:"The wildcard * means 'all columns'. Try: SELECT * FROM employees", xp:10, tables:["employees"],
        exercises:[
          { id:"1.1.e1", prompt:"Select all columns from the departments table.", validate:{ rowCount:5, hasCol:"dept_name" }, hint:"SELECT * FROM departments", xp:5 },
          { id:"1.1.e2", prompt:"Now select all data from the customers table — how many columns are there?", validate:{ rowCount:15, hasCol:"tier" }, hint:"SELECT * FROM customers", xp:3 }
        ] },

      { id:"1.2", title:"Picking Columns", concept:"Column Selection",
        theory:`<p>Instead of selecting everything with <code>*</code>, you can pick specific columns. This is cleaner and faster — databases can skip loading data you don't need.</p><p>List column names separated by commas after <code>SELECT</code>.</p>`,
        chips:[{t:"SELECT col1, col2",c:"chip-blue"},{t:"FROM",c:"chip-blue"}],
        task:"Select only the first_name and salary columns from employees.",
        starter:"-- Pick specific columns\nSELECT first_name, salary\nFROM employees;",
        solution:["select first_name, salary from employees","select first_name,salary from employees"],
        hint:"Name the columns: SELECT first_name, salary FROM employees", xp:10, tables:["employees"],
        exercises:[
          { id:"1.2.e1", prompt:"Select only dept_name and location from departments.", validate:{ rowCount:5, colCount:2, hasCols:["dept_name","location"] }, hint:"SELECT dept_name, location FROM departments", xp:5 },
          { id:"1.2.e2", prompt:"Select only the budget column from departments.", validate:{ rowCount:5, colCount:1, hasCol:"budget" }, hint:"SELECT budget FROM departments", xp:3 },
          { id:"1.2.e3", prompt:"Select first_name and hire_date from employees.", validate:{ rowCount:15, colCount:2, hasCols:["first_name","hire_date"] }, hint:"SELECT first_name, hire_date FROM employees", xp:5 }
        ] },

      { id:"1.3", title:"Filtering with WHERE", concept:"Filtering",
        theory:`<p>The <code>WHERE</code> clause filters rows. Only rows where the condition is true come back. Think of it like a bouncer checking IDs.</p><p>Operators: <code>=</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>. Text values go in single quotes.</p>`,
        chips:[{t:"WHERE",c:"chip-green"},{t:"=",c:"chip-cyan"},{t:">",c:"chip-cyan"},{t:"<",c:"chip-cyan"}],
        task:"Find all employees in the 'Engineering' department.",
        starter:"SELECT *\nFROM employees\nWHERE department = 'Engineering';",
        solution:["select * from employees where department = 'engineering'","select * from employees where department='engineering'"],
        hint:"Text values need single quotes: WHERE department = 'Engineering'", xp:15, tables:["employees"],
        exercises:[
          { id:"1.3.e1", prompt:"Find all employees in the Finance department.", validate:{ rowCount:3 }, hint:"WHERE department = 'Finance'", xp:5 },
          { id:"1.3.e2", prompt:"Find all employees earning more than 100000.", validate:{ rowCount:5 }, hint:"WHERE salary > 100000", xp:5 },
          { id:"1.3.e3", prompt:"Find all employees hired after 2020-01-01.", validate:{ rowCount:7 }, hint:"WHERE hire_date > '2020-01-01'", xp:5 }
        ] },

      { id:"1.4", title:"Sorting with ORDER BY", concept:"Sorting",
        theory:`<p><code>ORDER BY</code> sorts your results. By default it's ascending (A→Z, 1→9). Add <code>DESC</code> for descending order.</p><p>You can sort by multiple columns — the second column breaks ties in the first.</p>`,
        chips:[{t:"ORDER BY",c:"chip-purple"},{t:"ASC",c:"chip-cyan"},{t:"DESC",c:"chip-cyan"}],
        task:"Get all employees sorted by salary from highest to lowest.",
        starter:"SELECT first_name, department, salary\nFROM employees\nORDER BY salary DESC;",
        solution:["select first_name, department, salary from employees order by salary desc","select * from employees order by salary desc"],
        hint:"ORDER BY column_name DESC gives you highest first", xp:15, tables:["employees"],
        exercises:[
          { id:"1.4.e1", prompt:"Sort employees by hire_date from oldest to newest.", validate:{ rowCount:15 }, hint:"ORDER BY hire_date ASC", xp:5 },
          { id:"1.4.e2", prompt:"Sort departments by budget from lowest to highest.", validate:{ rowCount:5 }, hint:"ORDER BY budget ASC", xp:5 },
          { id:"1.4.e3", prompt:"Sort employees alphabetically by first_name (A to Z).", validate:{ rowCount:15 }, hint:"ORDER BY first_name ASC", xp:5 }
        ] },

      { id:"1.5", title:"LIMIT — Control Results", concept:"LIMIT",
        theory:`<p><code>LIMIT</code> caps the number of rows returned. Essential for previewing large datasets.</p><p>Combined with <code>ORDER BY</code>, LIMIT gives you things like "top 5 earners".</p>`,
        chips:[{t:"LIMIT n",c:"chip-amber"}],
        task:"Find the top 3 highest-paid employees.",
        starter:"SELECT first_name, salary\nFROM employees\nORDER BY salary DESC\nLIMIT 3;",
        solution:["select first_name, salary from employees order by salary desc limit 3","select * from employees order by salary desc limit 3"],
        hint:"ORDER BY salary DESC then LIMIT 3 at the end", xp:15, tables:["employees"],
        exercises:[
          { id:"1.5.e1", prompt:"Find the 5 lowest-paid employees.", validate:{ rowCount:5 }, hint:"ORDER BY salary ASC LIMIT 5", xp:5 },
          { id:"1.5.e2", prompt:"Find the 2 most recently hired employees.", validate:{ rowCount:2 }, hint:"ORDER BY hire_date DESC LIMIT 2", xp:5 },
          { id:"1.5.e3", prompt:"Get the single department with the largest budget.", validate:{ rowCount:1, hasValue:"Engineering" }, hint:"ORDER BY budget DESC LIMIT 1", xp:5 }
        ] }
    ]
  },
  {
    day: 2, title: "Filtering & Logic", lessons: [
      { id:"2.1", title:"AND & OR Logic", concept:"Boolean Logic",
        theory:`<p><code>AND</code> requires both conditions to be true. <code>OR</code> requires at least one. You can chain multiple conditions to build precise filters.</p><p>Use parentheses to control evaluation order, just like math.</p>`,
        chips:[{t:"AND",c:"chip-green"},{t:"OR",c:"chip-green"}],
        task:"Find employees in Engineering who earn more than 90000.",
        starter:"SELECT first_name, department, salary\nFROM employees\nWHERE department = 'Engineering'\n  AND salary > 90000;",
        solution:["select first_name, department, salary from employees where department = 'engineering' and salary > 90000","select * from employees where department = 'engineering' and salary > 90000"],
        hint:"Combine conditions: WHERE department = 'Engineering' AND salary > 90000", xp:20, tables:["employees"],
        exercises:[
          { id:"2.1.e1", prompt:"Find Marketing employees earning less than 80000.", validate:{ rowCount:2 }, hint:"WHERE department = 'Marketing' AND salary < 80000", xp:5 },
          { id:"2.1.e2", prompt:"Find employees in Finance OR HR departments.", validate:{ rowCount:6 }, hint:"WHERE department = 'Finance' OR department = 'HR'", xp:5 },
          { id:"2.1.e3", prompt:"Find employees hired after 2020-01-01 with salary above 85000.", validate:{ rowCount:2 }, hint:"WHERE hire_date > '2020-01-01' AND salary > 85000", xp:5 }
        ] },

      { id:"2.2", title:"IN — Match a List", concept:"IN Clause",
        theory:`<p><code>IN</code> is shorthand for multiple OR conditions. Instead of <code>dept = 'A' OR dept = 'B'</code>, write <code>dept IN ('A', 'B')</code>. Much cleaner.</p>`,
        chips:[{t:"IN (...)",c:"chip-blue"},{t:"NOT IN",c:"chip-blue"}],
        task:"Find employees in either 'Engineering' or 'Marketing'.",
        starter:"SELECT first_name, department\nFROM employees\nWHERE department IN ('Engineering', 'Marketing');",
        solution:["select first_name, department from employees where department in ('engineering', 'marketing')","select * from employees where department in ('engineering','marketing')"],
        hint:"WHERE department IN ('Engineering', 'Marketing')", xp:20, tables:["employees"],
        exercises:[
          { id:"2.2.e1", prompt:"Find employees in Finance, HR, or Marketing using IN.", validate:{ rowCount:10 }, hint:"WHERE department IN ('Finance', 'HR', 'Marketing')", xp:5 },
          { id:"2.2.e2", prompt:"Find employees NOT in Engineering or Finance using NOT IN.", validate:{ rowCount:7 }, hint:"WHERE department NOT IN ('Engineering', 'Finance')", xp:5 }
        ] },

      { id:"2.3", title:"LIKE — Pattern Matching", concept:"Pattern Matching",
        theory:`<p><code>LIKE</code> matches text patterns. Use <code>%</code> as a wildcard (any characters) and <code>_</code> for exactly one character.</p><p>Examples: <code>'J%'</code> = starts with J, <code>'%son'</code> = ends with son.</p>`,
        chips:[{t:"LIKE '%...'",c:"chip-cyan"},{t:"% wildcard",c:"chip-cyan"}],
        task:"Find all employees whose first name starts with 'J'.",
        starter:"SELECT first_name, department\nFROM employees\nWHERE first_name LIKE 'J%';",
        solution:["select first_name, department from employees where first_name like 'j%'","select * from employees where first_name like 'j%'"],
        hint:"LIKE 'J%' matches any name starting with J", xp:20, tables:["employees"],
        exercises:[
          { id:"2.3.e1", prompt:"Find employees whose first name ends with 'e'.", validate:{ rowCount:5 }, hint:"WHERE first_name LIKE '%e'", xp:5 },
          { id:"2.3.e2", prompt:"Find employees hired in 2019 using LIKE.", validate:{ rowCount:3 }, hint:"WHERE hire_date LIKE '2019%'", xp:5 },
          { id:"2.3.e3", prompt:"Find employees whose first name is exactly 4 letters long.", validate:{ rowCount:6 }, hint:"WHERE first_name LIKE '____' — four underscores = four characters", xp:5 }
        ] },

      { id:"2.4", title:"BETWEEN — Range Filter", concept:"BETWEEN",
        theory:`<p><code>BETWEEN x AND y</code> filters values in a range, inclusive of both ends. Works with numbers and dates.</p><p>Equivalent to <code>&gt;= x AND &lt;= y</code>, but much more readable.</p>`,
        chips:[{t:"BETWEEN x AND y",c:"chip-amber"}],
        task:"Find employees with salary between 70000 and 90000.",
        starter:"SELECT first_name, salary\nFROM employees\nWHERE salary BETWEEN 70000 AND 90000;",
        solution:["select first_name, salary from employees where salary between 70000 and 90000","select * from employees where salary between 70000 and 90000"],
        hint:"WHERE salary BETWEEN 70000 AND 90000", xp:20, tables:["employees"],
        exercises:[
          { id:"2.4.e1", prompt:"Find employees hired between 2019-01-01 and 2021-12-31.", validate:{ rowCount:7 }, hint:"WHERE hire_date BETWEEN '2019-01-01' AND '2021-12-31'", xp:5 },
          { id:"2.4.e2", prompt:"Find departments with a budget between 500000 and 1500000.", validate:{ rowCount:3 }, hint:"WHERE budget BETWEEN 500000 AND 1500000", xp:5 }
        ] }
    ]
  },
  {
    day: 3, title: "Aggregations", lessons: [
      { id:"3.1", title:"COUNT, SUM, AVG", concept:"Aggregate Functions",
        theory:`<p>Aggregate functions compute a value across multiple rows. The big five: <code>COUNT()</code> counts rows, <code>SUM()</code> adds numbers, <code>AVG()</code> averages, <code>MAX()</code> and <code>MIN()</code> find extremes.</p>`,
        chips:[{t:"COUNT()",c:"chip-blue"},{t:"SUM()",c:"chip-blue"},{t:"AVG()",c:"chip-blue"},{t:"MAX()",c:"chip-blue"}],
        task:"Count all employees and find the average, max, and min salary.",
        starter:"SELECT \n  COUNT(*) AS total_employees,\n  ROUND(AVG(salary), 0) AS avg_salary,\n  MAX(salary) AS max_salary,\n  MIN(salary) AS min_salary\nFROM employees;",
        solution:["select count(*) from employees","select count(*) as total_employees from employees"],
        hint:"SELECT COUNT(*), AVG(salary), MAX(salary), MIN(salary) FROM employees", xp:25, tables:["employees"],
        exercises:[
          { id:"3.1.e1", prompt:"Find the total combined salary of all employees.", validate:{ rowCount:1 }, hint:"SELECT SUM(salary) FROM employees", xp:5 },
          { id:"3.1.e2", prompt:"Find the minimum salary in the company.", validate:{ rowCount:1 }, hint:"SELECT MIN(salary) FROM employees", xp:5 },
          { id:"3.1.e3", prompt:"Find the total budget across all departments.", validate:{ rowCount:1 }, hint:"SELECT SUM(budget) FROM departments", xp:5 }
        ] },

      { id:"3.2", title:"GROUP BY", concept:"Grouping",
        theory:`<p><code>GROUP BY</code> is the most powerful SQL feature. It collapses rows into groups and lets you aggregate each group separately. "What's the average salary per department?" — that's GROUP BY.</p>`,
        chips:[{t:"GROUP BY",c:"chip-green"},{t:"aggregate per group",c:"chip-cyan"}],
        task:"Find the average salary for each department.",
        starter:"SELECT \n  department,\n  ROUND(AVG(salary), 0) AS avg_salary,\n  COUNT(*) AS headcount\nFROM employees\nGROUP BY department;",
        solution:["select department, avg(salary) from employees group by department","select department, round(avg(salary),0) as avg_salary from employees group by department"],
        hint:"GROUP BY department, then AVG(salary) gives per-department averages", xp:25, tables:["employees"],
        exercises:[
          { id:"3.2.e1", prompt:"Find the total salary spend per department.", validate:{ rowCount:4 }, hint:"SELECT department, SUM(salary) FROM employees GROUP BY department", xp:8 },
          { id:"3.2.e2", prompt:"Find the maximum salary in each department.", validate:{ rowCount:4 }, hint:"SELECT department, MAX(salary) FROM employees GROUP BY department", xp:8 },
          { id:"3.2.e3", prompt:"Count the number of employees per department.", validate:{ rowCount:4 }, hint:"SELECT department, COUNT(*) FROM employees GROUP BY department", xp:8 }
        ] },

      { id:"3.3", title:"HAVING — Filter Groups", concept:"HAVING",
        theory:`<p><code>WHERE</code> filters rows before grouping. <code>HAVING</code> filters groups after aggregation. Rule of thumb: if you're filtering on an aggregated value, use HAVING.</p>`,
        chips:[{t:"HAVING",c:"chip-purple"},{t:"vs WHERE",c:"chip-amber"}],
        task:"Find departments where the average salary is above 85000.",
        starter:"SELECT \n  department,\n  ROUND(AVG(salary), 0) AS avg_salary\nFROM employees\nGROUP BY department\nHAVING AVG(salary) > 85000;",
        solution:["select department, avg(salary) from employees group by department having avg(salary) > 85000"],
        hint:"Add HAVING AVG(salary) > 85000 after GROUP BY", xp:30, tables:["employees"],
        exercises:[
          { id:"3.3.e1", prompt:"Find departments with more than 3 employees.", validate:{ rowCount:2 }, hint:"GROUP BY department HAVING COUNT(*) > 3", xp:8 },
          { id:"3.3.e2", prompt:"Find departments where total salary spend exceeds 250000.", validate:{ rowCount:3 }, hint:"GROUP BY department HAVING SUM(salary) > 250000", xp:8 }
        ] },

      { id:"3.4", title:"Aliases with AS", concept:"Aliases",
        theory:`<p><code>AS</code> renames a column or table in your output. Makes results readable. <code>AVG(salary) AS avg_salary</code> gives you a nice column name instead of a raw function call.</p>`,
        chips:[{t:"AS alias",c:"chip-cyan"}],
        task:"Count employees per department, label the count as 'team_size', ordered by team_size descending.",
        starter:"SELECT \n  department,\n  COUNT(*) AS team_size\nFROM employees\nGROUP BY department\nORDER BY team_size DESC;",
        solution:["select department, count(*) as team_size from employees group by department order by team_size desc"],
        hint:"COUNT(*) AS team_size, then ORDER BY team_size DESC", xp:25, tables:["employees"],
        exercises:[
          { id:"3.4.e1", prompt:"Show avg salary per department labelled 'avg_pay', ordered highest first.", validate:{ rowCount:4, hasCol:"avg_pay" }, hint:"SELECT department, AVG(salary) AS avg_pay FROM employees GROUP BY department ORDER BY avg_pay DESC", xp:8 },
          { id:"3.4.e2", prompt:"Show each department's max salary labelled 'top_salary'.", validate:{ rowCount:4, hasCol:"top_salary" }, hint:"SELECT department, MAX(salary) AS top_salary FROM employees GROUP BY department", xp:5 }
        ] }
    ]
  },
  {
    day: 4, title: "Joining Tables", lessons: [
      { id:"4.1", title:"INNER JOIN", concept:"JOIN",
        theory:`<p>Real databases split data across tables. <code>JOIN</code> stitches them together. <code>INNER JOIN</code> returns rows only where there's a match in both tables.</p><p>You join ON the column that links the two tables (usually an ID).</p>`,
        chips:[{t:"INNER JOIN",c:"chip-blue"},{t:"ON",c:"chip-cyan"},{t:"table.column",c:"chip-green"}],
        task:"Join employees to departments to see each employee's department location.",
        starter:"SELECT \n  e.first_name,\n  e.department,\n  d.location\nFROM employees e\nINNER JOIN departments d ON e.department = d.dept_name;",
        solution:["select e.first_name, e.department, d.location from employees e inner join departments d on e.department = d.dept_name","select e.first_name, e.department, d.location from employees e join departments d on e.department = d.dept_name"],
        hint:"JOIN departments d ON e.department = d.dept_name", xp:30, tables:["employees","departments"],
        exercises:[
          { id:"4.1.e1", prompt:"Show each employee's name and their department's budget.", validate:{ rowCount:15 }, hint:"JOIN departments d ON e.department = d.dept_name, then SELECT d.budget", xp:8 },
          { id:"4.1.e2", prompt:"Show employees who work in departments located in San Francisco.", validate:{ rowCount:5 }, hint:"JOIN departments, then WHERE d.location = 'San Francisco'", xp:8 }
        ] },

      { id:"4.2", title:"LEFT JOIN", concept:"LEFT JOIN",
        theory:`<p><code>LEFT JOIN</code> keeps all rows from the left table, even if there's no match on the right. Unmatched right-side columns show up as NULL. Great for finding things with no match.</p>`,
        chips:[{t:"LEFT JOIN",c:"chip-amber"},{t:"NULL values",c:"chip-red"}],
        task:"Get all departments and show how many employees are in each, including empty departments.",
        starter:"SELECT \n  d.dept_name,\n  d.location,\n  COUNT(e.id) AS employee_count\nFROM departments d\nLEFT JOIN employees e ON d.dept_name = e.department\nGROUP BY d.dept_name, d.location;",
        solution:["select d.dept_name, count(e.id) from departments d left join employees e on d.dept_name = e.department group by d.dept_name"],
        hint:"LEFT JOIN keeps all departments. COUNT(e.id) is 0 for empty ones.", xp:35, tables:["employees","departments"],
        exercises:[
          { id:"4.2.e1", prompt:"Find departments that have zero employees using LEFT JOIN (look for NULL).", validate:{ rowCount:1, hasValue:"Legal" }, hint:"FROM departments d LEFT JOIN employees e ON ... WHERE e.id IS NULL", xp:10 },
          { id:"4.2.e2", prompt:"Show all departments with the total salary of their employees (0 for empty departments).", validate:{ rowCount:5 }, hint:"LEFT JOIN, then COALESCE(SUM(e.salary), 0) AS total_salary", xp:10 }
        ] },

      { id:"4.3", title:"Multiple JOINs", concept:"Chaining JOINs",
        theory:`<p>You can chain multiple JOINs. Each JOIN adds another table to your query. The order matters — join tables step by step, always connecting on a shared column.</p>`,
        chips:[{t:"JOIN + JOIN",c:"chip-purple"},{t:"e.col = d.col",c:"chip-cyan"}],
        task:"Get employee name, their salary, and their department's budget.",
        starter:"SELECT \n  e.first_name,\n  e.salary,\n  d.dept_name,\n  d.budget\nFROM employees e\nJOIN departments d ON e.department = d.dept_name\nORDER BY d.budget DESC;",
        solution:["select e.first_name, e.salary, d.dept_name, d.budget from employees e join departments d on e.department = d.dept_name order by d.budget desc"],
        hint:"JOIN employees to departments, then select columns from both using e. and d. prefixes", xp:35, tables:["employees","departments"],
        exercises:[
          { id:"4.3.e1", prompt:"Find employees whose salary exceeds 10% of their department's budget.", validate:{ rowCount:6 }, hint:"JOIN departments, then WHERE e.salary > d.budget / 10", xp:10 },
          { id:"4.3.e2", prompt:"Show each department's location and the name of their highest-paid employee.", validate:{ rowCount:4 }, hint:"JOIN, GROUP BY dept, MAX(salary) — or use a subquery/window function", xp:12 }
        ] }
    ]
  },
  {
    day: 5, title: "Subqueries", lessons: [
      { id:"5.1", title:"Subquery in WHERE", concept:"Subquery",
        theory:`<p>A subquery is a query inside a query. The inner query runs first, and its result is used by the outer query. Wrap it in parentheses.</p><p>Classic use: "find employees who earn more than the company average."</p>`,
        chips:[{t:"(SELECT ...)",c:"chip-cyan"},{t:"nested query",c:"chip-purple"}],
        task:"Find employees who earn more than the average salary.",
        starter:"SELECT first_name, salary\nFROM employees\nWHERE salary > (\n  SELECT AVG(salary) FROM employees\n);",
        solution:["select first_name, salary from employees where salary > (select avg(salary) from employees)"],
        hint:"The inner query (SELECT AVG(salary) FROM employees) gives you the average to compare against.", xp:35, tables:["employees"],
        exercises:[
          { id:"5.1.e1", prompt:"Find the employee(s) with the maximum salary using a subquery.", validate:{ rowCount:1 }, hint:"WHERE salary = (SELECT MAX(salary) FROM employees)", xp:8 },
          { id:"5.1.e2", prompt:"Find employees who earn more than the average Engineering salary.", validate:{ rowCount:3 }, hint:"WHERE salary > (SELECT AVG(salary) FROM employees WHERE department = 'Engineering')", xp:10 }
        ] },

      { id:"5.2", title:"Subquery in FROM", concept:"Derived Tables",
        theory:`<p>You can use a subquery as a temporary table in the FROM clause (called a derived table). Give it an alias and query it like any table. Useful for multi-step logic.</p>`,
        chips:[{t:"FROM (SELECT...)",c:"chip-blue"},{t:"AS alias",c:"chip-cyan"}],
        task:"Get department averages, then find which are above the company-wide average.",
        starter:"SELECT dept, avg_sal\nFROM (\n  SELECT department AS dept, ROUND(AVG(salary),0) AS avg_sal\n  FROM employees\n  GROUP BY department\n) AS dept_avgs\nWHERE avg_sal > (\n  SELECT AVG(salary) FROM employees\n);",
        solution:["select dept, avg_sal from (select department as dept, round(avg(salary),0) as avg_sal from employees group by department) as dept_avgs where avg_sal > (select avg(salary) from employees)"],
        hint:"Wrap the GROUP BY query in parentheses as a derived table, then filter it.", xp:40, tables:["employees"],
        exercises:[
          { id:"5.2.e1", prompt:"Using a subquery in FROM, find the department with the highest average salary.", validate:{ rowCount:1, hasValue:"Finance" }, hint:"Wrap the GROUP BY query as a derived table, then ORDER BY avg_sal DESC LIMIT 1", xp:10 }
        ] },

      { id:"5.3", title:"EXISTS", concept:"EXISTS",
        theory:`<p><code>EXISTS</code> checks whether a subquery returns any rows at all. It's like asking "does something exist that matches this condition?" Often faster than IN for large datasets.</p>`,
        chips:[{t:"EXISTS",c:"chip-green"},{t:"NOT EXISTS",c:"chip-red"}],
        task:"Find departments that have at least one employee earning over 100000.",
        starter:"SELECT dept_name\nFROM departments d\nWHERE EXISTS (\n  SELECT 1 FROM employees e\n  WHERE e.department = d.dept_name\n  AND e.salary > 100000\n);",
        solution:["select dept_name from departments d where exists (select 1 from employees e where e.department = d.dept_name and e.salary > 100000)"],
        hint:"EXISTS returns TRUE if the inner SELECT finds any rows", xp:40, tables:["employees","departments"],
        exercises:[
          { id:"5.3.e1", prompt:"Find departments that have NO employees earning over 80000 using NOT EXISTS.", validate:{ rowCount:2 }, hint:"WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department = d.dept_name AND e.salary > 80000)", xp:10 },
          { id:"5.3.e2", prompt:"Find employees whose department has at least 3 people using EXISTS.", validate:{ rowCount:15 }, hint:"EXISTS with a correlated subquery that GROUP BY department HAVING COUNT(*) >= 3", xp:12 }
        ] }
    ]
  },
  {
    day: 6, title: "Window Functions", lessons: [
      { id:"6.1", title:"ROW_NUMBER & RANK", concept:"Window Functions",
        theory:`<p>Window functions compute values across a "window" of rows without collapsing them like GROUP BY. <code>ROW_NUMBER()</code> gives each row a unique number. <code>RANK()</code> allows ties. <code>OVER()</code> defines the window.</p>`,
        chips:[{t:"ROW_NUMBER()",c:"chip-blue"},{t:"RANK()",c:"chip-purple"},{t:"OVER()",c:"chip-cyan"}],
        task:"Rank employees by salary within each department.",
        starter:"SELECT \n  first_name,\n  department,\n  salary,\n  RANK() OVER (\n    PARTITION BY department\n    ORDER BY salary DESC\n  ) AS dept_rank\nFROM employees;",
        solution:["select first_name, department, salary, rank() over (partition by department order by salary desc) as dept_rank from employees"],
        hint:"RANK() OVER (PARTITION BY department ORDER BY salary DESC)", xp:45, tables:["employees"],
        exercises:[
          { id:"6.1.e1", prompt:"Number all employees globally by salary descending using ROW_NUMBER().", validate:{ rowCount:15 }, hint:"ROW_NUMBER() OVER (ORDER BY salary DESC) AS global_rank", xp:8 },
          { id:"6.1.e2", prompt:"Find only the top earner per department (rank = 1) using RANK() in a CTE.", validate:{ rowCount:4 }, hint:"CTE with RANK() OVER (PARTITION BY department ORDER BY salary DESC), then WHERE rnk = 1", xp:12 }
        ] },

      { id:"6.2", title:"LAG & LEAD", concept:"Offset Functions",
        theory:`<p><code>LAG(col, n)</code> looks back n rows. <code>LEAD(col, n)</code> looks forward. Essential for comparing a row to its neighbor — like month-over-month changes.</p>`,
        chips:[{t:"LAG(col, n)",c:"chip-amber"},{t:"LEAD(col, n)",c:"chip-amber"}],
        task:"Show each employee's salary and the salary of the person ranked just above them in the same department.",
        starter:"SELECT \n  first_name,\n  department,\n  salary,\n  LAG(salary) OVER (\n    PARTITION BY department\n    ORDER BY salary DESC\n  ) AS higher_salary\nFROM employees;",
        solution:["select first_name, department, salary, lag(salary) over (partition by department order by salary desc) as higher_salary from employees"],
        hint:"LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC)", xp:45, tables:["employees"],
        exercises:[
          { id:"6.2.e1", prompt:"Show each employee's salary and the salary of the next lower-paid person in their department using LEAD().", validate:{ rowCount:15 }, hint:"LEAD(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS next_lower", xp:10 },
          { id:"6.2.e2", prompt:"Show each employee and the salary difference between them and the person above them in their department.", validate:{ rowCount:15 }, hint:"salary - LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS diff_from_above", xp:12 }
        ] },

      { id:"6.3", title:"Running Totals", concept:"Running Sum",
        theory:`<p>Combine <code>SUM()</code> with <code>OVER(ORDER BY ...)</code> to compute a running total. This is a cumulative sum — each row includes all previous rows' values.</p>`,
        chips:[{t:"SUM() OVER()",c:"chip-green"},{t:"cumulative",c:"chip-cyan"}],
        task:"Show employees ordered by salary with a running total of salary spend.",
        starter:"SELECT \n  first_name,\n  salary,\n  SUM(salary) OVER (\n    ORDER BY salary DESC\n  ) AS running_total\nFROM employees\nORDER BY salary DESC;",
        solution:["select first_name, salary, sum(salary) over (order by salary desc) as running_total from employees order by salary desc"],
        hint:"SUM(salary) OVER (ORDER BY salary DESC) builds a cumulative sum", xp:45, tables:["employees"],
        exercises:[
          { id:"6.3.e1", prompt:"Show a running count of employees ordered by hire_date (earliest first).", validate:{ rowCount:15 }, hint:"COUNT(*) OVER (ORDER BY hire_date) AS running_count", xp:8 },
          { id:"6.3.e2", prompt:"Show each employee's salary as a percentage of the running total salary spend.", validate:{ rowCount:15 }, hint:"salary / SUM(salary) OVER (ORDER BY salary DESC) * 100 AS pct_of_running_total", xp:12 }
        ] }
    ]
  },
  {
    day: 7, title: "Pro Patterns", lessons: [
      { id:"7.1", title:"CTEs — WITH Clause", concept:"Common Table Expressions",
        theory:`<p>CTEs (Common Table Expressions) are named temporary results you define with <code>WITH cte AS (...)</code>. They make complex queries readable by breaking them into named steps.</p>`,
        chips:[{t:"WITH name AS (...)",c:"chip-blue"},{t:"CTE",c:"chip-purple"}],
        task:"Use a CTE to find the top earner in each department.",
        starter:"WITH ranked AS (\n  SELECT \n    first_name,\n    department,\n    salary,\n    RANK() OVER (\n      PARTITION BY department\n      ORDER BY salary DESC\n    ) AS rnk\n  FROM employees\n)\nSELECT first_name, department, salary\nFROM ranked\nWHERE rnk = 1;",
        solution:["with ranked as (select first_name, department, salary, rank() over (partition by department order by salary desc) as rnk from employees) select first_name, department, salary from ranked where rnk = 1"],
        hint:"Define the CTE with ranking, then SELECT from it WHERE rnk = 1", xp:50, tables:["employees"],
        exercises:[
          { id:"7.1.e1", prompt:"Use a CTE to find all employees who earn above the company average salary.", validate:{ rowCount:7 }, hint:"CTE that computes AVG(salary), then outer query WHERE salary > that value", xp:12 },
          { id:"7.1.e2", prompt:"Write a CTE that computes dept averages, then select only depts above the company-wide average.", validate:{ rowCount:2 }, hint:"CTE 1: dept averages. CTE 2 or subquery: company average. Filter WHERE dept_avg > company_avg", xp:15 }
        ] },

      { id:"7.2", title:"CASE WHEN", concept:"Conditional Logic",
        theory:`<p><code>CASE WHEN</code> is SQL's if-else. It lets you create new columns based on conditions — like bucketing salaries into bands or labeling records. Ends with <code>END</code>.</p>`,
        chips:[{t:"CASE WHEN",c:"chip-amber"},{t:"THEN",c:"chip-amber"},{t:"ELSE ... END",c:"chip-amber"}],
        task:"Categorize employees into salary bands: 'Junior' (<70k), 'Mid' (70k–100k), 'Senior' (>100k).",
        starter:"SELECT \n  first_name,\n  salary,\n  CASE \n    WHEN salary < 70000 THEN 'Junior'\n    WHEN salary BETWEEN 70000 AND 100000 THEN 'Mid'\n    ELSE 'Senior'\n  END AS level\nFROM employees\nORDER BY salary;",
        solution:["select first_name, salary, case when salary < 70000 then 'junior' when salary between 70000 and 100000 then 'mid' else 'senior' end as level from employees order by salary"],
        hint:"CASE WHEN salary < 70000 THEN 'Junior' WHEN ... ELSE ... END", xp:50, tables:["employees"],
        exercises:[
          { id:"7.2.e1", prompt:"Categorise departments by budget: 'Small' (<500k), 'Medium' (500k–1.2M), 'Large' (>1.2M).", validate:{ rowCount:5 }, hint:"SELECT dept_name, CASE WHEN budget < 500000 THEN 'Small' WHEN budget <= 1200000 THEN 'Medium' ELSE 'Large' END", xp:10 },
          { id:"7.2.e2", prompt:"Label each employee's seniority: 'Veteran' (hired before 2019), 'Established' (2019–2021), 'New Hire' (after 2021).", validate:{ rowCount:15 }, hint:"CASE WHEN hire_date < '2019-01-01' THEN 'Veteran' WHEN hire_date <= '2021-12-31' THEN 'Established' ELSE 'New Hire' END", xp:10 }
        ] },

      { id:"7.3", title:"Final Challenge", concept:"Capstone",
        theory:`<p>You've made it to the final challenge! Combine everything: JOINs, aggregations, window functions, CTEs, and CASE WHEN. This is the kind of query you'll write every day as a data engineer.</p>`,
        chips:[{t:"CTE",c:"chip-blue"},{t:"JOIN",c:"chip-green"},{t:"WINDOW",c:"chip-purple"},{t:"CASE",c:"chip-amber"}],
        task:"Find the highest-paid employee in each department, show their department's total budget, and label if their salary is above or below half the budget.",
        starter:"WITH top_earners AS (\n  SELECT \n    first_name,\n    department,\n    salary,\n    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk\n  FROM employees\n)\nSELECT \n  t.first_name,\n  t.department,\n  t.salary,\n  d.budget,\n  CASE \n    WHEN t.salary > d.budget / 2 THEN 'High relative cost'\n    ELSE 'Reasonable'\n  END AS cost_flag\nFROM top_earners t\nJOIN departments d ON t.department = d.dept_name\nWHERE t.rnk = 1\nORDER BY t.salary DESC;",
        solution:["with top_earners as"],
        hint:"Build the CTE first with RANK(), then JOIN departments, then add the CASE WHEN.", xp:100, tables:["employees","departments"],
        exercises:[
          { id:"7.3.e1", prompt:"Find the top 2 earners in each department (both 1st and 2nd place). Use a CTE with RANK().", validate:{ rowCount:8 }, hint:"CTE with RANK() OVER (PARTITION BY department ORDER BY salary DESC), then WHERE rnk <= 2", xp:15 },
          { id:"7.3.e2", prompt:"Show each department's total salary spend vs its budget, and flag 'Over Budget' or 'Under Budget' using CASE WHEN.", validate:{ rowCount:4 }, hint:"JOIN employees to departments, SUM(salary), compare to d.budget with CASE WHEN", xp:20 }
        ] }
    ]
  },
  {
    day: 8, title: "NULL Handling", lessons: [
      { id:"8.1", title:"IS NULL / IS NOT NULL", concept:"NULL Checks",
        theory:`<p>NULL represents missing or unknown data — not zero, not an empty string. The tricky part: <code>salary = NULL</code> never evaluates to true, even for NULL values. You <em>must</em> use <code>IS NULL</code> or <code>IS NOT NULL</code>.</p><p>This trips up beginners constantly. Always use the IS keyword when checking for NULLs.</p>`,
        chips:[{t:"IS NULL",c:"chip-red"},{t:"IS NOT NULL",c:"chip-green"}],
        task:"Find all customers who don't have an email address on file.",
        starter:"",
        solution:["where email is null"],
        hint:"Use IS NULL not = NULL: WHERE email IS NULL", xp:20, tables:["customers"],
        exercises:[
          { id:"8.1.e1", prompt:"Find customers who DO have an email address.", solution:["where email is not null"], hint:"WHERE email IS NOT NULL", xp:5 },
          { id:"8.1.e2", prompt:"Find customers where EITHER email OR city is NULL.", solution:["where email is null or city is null"], hint:"Combine two IS NULL checks with OR", xp:8 },
          { id:"8.1.e3", prompt:"Count how many employees have no manager (top-level managers).", solution:["where manager_id is null","count"], hint:"WHERE manager_id IS NULL with COUNT(*)", xp:8 }
        ] },

      { id:"8.2", title:"COALESCE & IFNULL", concept:"NULL Substitution",
        theory:`<p><code>COALESCE(a, b, c)</code> returns the first non-NULL value in the list. It's perfect for substituting a fallback when a column might be NULL. <code>IFNULL(a, b)</code> is SQLite's two-argument shorthand.</p><p>These functions are essential in any query that surfaces data directly to users or dashboards.</p>`,
        chips:[{t:"COALESCE(a,b)",c:"chip-amber"},{t:"IFNULL(a,b)",c:"chip-amber"}],
        task:"Show all customer names and emails. Replace any NULL email with 'no email on file'.",
        starter:"",
        solution:["coalesce(email"],
        hint:"SELECT name, COALESCE(email, 'no email on file') AS email FROM customers", xp:20, tables:["customers"],
        exercises:[
          { id:"8.2.e1", prompt:"Show customer names and cities, replacing NULL city with 'Unknown'.", solution:["coalesce(city","ifnull(city"], hint:"COALESCE(city, 'Unknown') or IFNULL(city, 'Unknown')", xp:5 },
          { id:"8.2.e2", prompt:"Show each employee's manager_id, replacing NULL with 0 to indicate top-level.", solution:["coalesce(manager_id, 0)","ifnull(manager_id, 0)"], hint:"COALESCE(manager_id, 0)", xp:8 }
        ] },

      { id:"8.3", title:"NULLIF", concept:"Value to NULL",
        theory:`<p><code>NULLIF(a, b)</code> is the reverse of COALESCE — it returns NULL when <code>a</code> equals <code>b</code>, otherwise returns <code>a</code>. Use it to treat sentinel values (like 0 or empty string) as NULL so aggregates ignore them.</p>`,
        chips:[{t:"NULLIF(a,b)",c:"chip-cyan"}],
        task:"Calculate the average salary, but use NULLIF to treat any salary of 0 as NULL (so it's excluded from the average).",
        starter:"",
        solution:["nullif(salary, 0)"],
        hint:"AVG(NULLIF(salary, 0)) — NULLIF turns 0 into NULL, which AVG ignores", xp:20, tables:["employees"],
        exercises:[
          { id:"8.3.e1", prompt:"Show customer tier, but return NULL for any tier labelled 'Basic' (use NULLIF).", solution:["nullif(tier, 'basic')","nullif(tier,'basic')"], hint:"NULLIF(tier, 'Basic')", xp:5 },
          { id:"8.3.e2", prompt:"Use NULLIF to safely calculate revenue-per-item without dividing by zero: total / NULLIF(quantity, 0).", solution:["nullif(quantity, 0)"], hint:"total / NULLIF(quantity, 0) prevents division-by-zero errors", xp:8 }
        ] },

      { id:"8.4", title:"NULLs in Aggregates", concept:"Aggregate & NULL",
        theory:`<p>Aggregate functions like <code>COUNT</code>, <code>AVG</code>, and <code>SUM</code> silently ignore NULLs. <code>COUNT(*)</code> counts all rows, but <code>COUNT(email)</code> skips rows where email is NULL. This difference produces subtly different — and often wrong — results if you're not aware of it.</p>`,
        chips:[{t:"COUNT(*) vs COUNT(col)",c:"chip-blue"},{t:"NULLs ignored",c:"chip-red"}],
        task:"In one query, show the total number of customers and the count of customers who have a valid email address.",
        starter:"",
        solution:["count(*) ","count(email)"],
        hint:"SELECT COUNT(*) AS total, COUNT(email) AS with_email FROM customers", xp:25, tables:["customers"],
        exercises:[
          { id:"8.4.e1", prompt:"Count customers with a city vs without a city in one query.", solution:["count(city)","count(*) -"], hint:"COUNT(city) skips NULLs; subtract from COUNT(*) for the no-city count", xp:8 },
          { id:"8.4.e2", prompt:"Find the average salary including all employees, then show what it would be if NULL manager employees (the managers themselves) were excluded via NULLIF.", solution:["avg(nullif(salary","avg(salary)"], hint:"AVG(salary) vs AVG(NULLIF(salary, salary)) WHERE manager_id IS NULL — or just filter", xp:10 }
        ] }
    ]
  },
  {
    day: 9, title: "String Functions", lessons: [
      { id:"9.1", title:"UPPER, LOWER, LENGTH", concept:"Case & Length",
        theory:`<p>String functions let you clean and format text. <code>UPPER()</code> and <code>LOWER()</code> normalise case — essential when you need to compare strings regardless of how they were entered. <code>LENGTH()</code> counts characters.</p>`,
        chips:[{t:"UPPER()",c:"chip-blue"},{t:"LOWER()",c:"chip-blue"},{t:"LENGTH()",c:"chip-cyan"}],
        task:"Show all employee first names in uppercase alongside the character length of each name.",
        starter:"",
        solution:["upper(first_name)","length(first_name)"],
        hint:"SELECT UPPER(first_name), LENGTH(first_name) FROM employees", xp:20, tables:["employees"],
        exercises:[
          { id:"9.1.e1", prompt:"Show all customer names in lowercase.", solution:["lower(name)"], hint:"SELECT LOWER(name) FROM customers", xp:5 },
          { id:"9.1.e2", prompt:"Find all employees whose first name is longer than 4 characters.", solution:["length(first_name) > 4"], hint:"WHERE LENGTH(first_name) > 4", xp:8 },
          { id:"9.1.e3", prompt:"Show each department name in uppercase with the length of the name.", solution:["upper(dept_name)","length(dept_name)"], hint:"SELECT UPPER(dept_name), LENGTH(dept_name) FROM departments", xp:5 }
        ] },

      { id:"9.2", title:"SUBSTR", concept:"Substring Extraction",
        theory:`<p><code>SUBSTR(string, start, length)</code> extracts part of a string. Positions start at 1 (not 0). <code>SUBSTR('Hello', 2, 3)</code> returns <code>'ell'</code>. Omitting the length returns everything from the start position to the end.</p>`,
        chips:[{t:"SUBSTR(s, start, len)",c:"chip-green"}],
        task:"Extract the hire year from hire_date for each employee using SUBSTR.",
        starter:"",
        solution:["substr(hire_date, 1, 4)"],
        hint:"SUBSTR(hire_date, 1, 4) grabs the first 4 characters — the year", xp:20, tables:["employees"],
        exercises:[
          { id:"9.2.e1", prompt:"Extract the first 3 characters of each employee's first name as an 'abbrev' column.", solution:["substr(first_name, 1, 3)"], hint:"SUBSTR(first_name, 1, 3)", xp:5 },
          { id:"9.2.e2", prompt:"Extract the month portion (characters 6-7) from hire_date.", solution:["substr(hire_date, 6, 2)"], hint:"SUBSTR(hire_date, 6, 2) gives the MM part of YYYY-MM-DD", xp:8 },
          { id:"9.2.e3", prompt:"Find employees hired in March (month = '03') using SUBSTR.", solution:["substr(hire_date, 6, 2) = '03'"], hint:"WHERE SUBSTR(hire_date, 6, 2) = '03'", xp:8 }
        ] },

      { id:"9.3", title:"REPLACE & TRIM", concept:"Text Cleaning",
        theory:`<p><code>REPLACE(string, old, new)</code> swaps every occurrence of a substring. <code>TRIM(string)</code> strips leading and trailing whitespace. <code>LTRIM</code> and <code>RTRIM</code> trim one side only. These are the workhorses of data cleaning.</p>`,
        chips:[{t:"REPLACE(s,old,new)",c:"chip-amber"},{t:"TRIM()",c:"chip-cyan"}],
        task:"In the customers table, show names with '.com' replaced by '.org' in their email addresses.",
        starter:"",
        solution:["replace(email, '.com', '.org')"],
        hint:"SELECT name, REPLACE(email, '.com', '.org') AS email FROM customers", xp:20, tables:["customers"],
        exercises:[
          { id:"9.3.e1", prompt:"Replace 'Engineering' with 'Eng' in the department column for display purposes.", solution:["replace(department, 'engineering', 'eng')","replace(department,'engineering','eng')"], hint:"REPLACE(department, 'Engineering', 'Eng')", xp:5 },
          { id:"9.3.e2", prompt:"Show TRIM applied to a department name to demonstrate whitespace removal.", solution:["trim(department)","trim(dept_name)"], hint:"SELECT TRIM(department) FROM employees", xp:5 }
        ] },

      { id:"9.4", title:"String Concatenation with ||", concept:"Concatenation",
        theory:`<p>SQLite uses <code>||</code> to join strings (not <code>+</code> or <code>CONCAT()</code>). <code>'Hello' || ' ' || 'World'</code> produces <code>'Hello World'</code>. This is how you build display labels, composite keys, or formatted output.</p>`,
        chips:[{t:"a || b",c:"chip-purple"},{t:"'text' || col",c:"chip-cyan"}],
        task:"Build a 'contact' column combining each employee's name and department: e.g. 'Alice (Engineering)'.",
        starter:"",
        solution:["first_name || ' (' || department || ')'"],
        hint:"first_name || ' (' || department || ')' AS contact", xp:20, tables:["employees"],
        exercises:[
          { id:"9.4.e1", prompt:"Combine dept_name and location into one label like 'Engineering — San Francisco'.", solution:["dept_name || ' — ' || location","dept_name || '"], hint:"dept_name || ' — ' || location", xp:5 },
          { id:"9.4.e2", prompt:"Build a customer label: 'Alice Chen (Pro)' using name and tier.", solution:["name || ' (' || tier || ')'"], hint:"name || ' (' || tier || ')'", xp:8 }
        ] },

      { id:"9.5", title:"INSTR — Finding Substrings", concept:"Position Search",
        theory:`<p><code>INSTR(string, substring)</code> returns the position (1-based) of the first occurrence of a substring, or 0 if not found. Use it when <code>LIKE</code> is too blunt — you need to know whether something appears anywhere in a string.</p>`,
        chips:[{t:"INSTR(s, substr)",c:"chip-green"},{t:"> 0 means found",c:"chip-cyan"}],
        task:"Find all customers whose email contains 'gmail' — use INSTR, not LIKE.",
        starter:"",
        solution:["instr(email, 'gmail') > 0"],
        hint:"WHERE INSTR(email, 'gmail') > 0", xp:25, tables:["customers"],
        exercises:[
          { id:"9.5.e1", prompt:"Find customers whose email contains 'outlook'.", solution:["instr(email, 'outlook') > 0"], hint:"WHERE INSTR(email, 'outlook') > 0", xp:5 },
          { id:"9.5.e2", prompt:"Find customers whose name contains the letter 'a' (lowercase) — use INSTR.", solution:["instr(lower(name), 'a') > 0","instr(name, 'a') > 0"], hint:"INSTR(LOWER(name), 'a') > 0", xp:8 }
        ] }
    ]
  },
  {
    day: 10, title: "Date & Time", lessons: [
      { id:"10.1", title:"Date Filtering Basics", concept:"ISO Dates",
        theory:`<p>SQLite stores dates as text in ISO format (<code>YYYY-MM-DD</code>). Because of this consistent format, string comparison (<code>&gt;</code>, <code>&lt;</code>, <code>BETWEEN</code>, <code>LIKE</code>) works correctly for dates. <code>date('now')</code> returns today's date.</p>`,
        chips:[{t:"date('now')",c:"chip-blue"},{t:"YYYY-MM-DD",c:"chip-cyan"}],
        task:"Find all employees hired in the year 2020.",
        starter:"",
        solution:["hire_date like '2020%'","hire_date between '2020-01-01' and '2020-12-31'","hire_date >= '2020-01-01' and hire_date <= '2020-12-31'"],
        hint:"hire_date LIKE '2020%' works because ISO format starts with the year", xp:20, tables:["employees"],
        exercises:[
          { id:"10.1.e1", prompt:"Find all orders placed in 2023.", solution:["order_date like '2023%'","order_date between '2023-01-01' and '2023-12-31'"], hint:"order_date LIKE '2023%'", xp:5 },
          { id:"10.1.e2", prompt:"Find employees hired after 2020-01-01.", solution:["hire_date > '2020-01-01'"], hint:"WHERE hire_date > '2020-01-01'", xp:5 },
          { id:"10.1.e3", prompt:"Find customers who signed up before 2023.", solution:["signup_date < '2023-01-01'","signup_date < '2023'"], hint:"WHERE signup_date < '2023-01-01'", xp:8 }
        ] },

      { id:"10.2", title:"STRFTIME — Formatting Dates", concept:"Date Formatting",
        theory:`<p><code>strftime(format, date)</code> formats a date string. Key placeholders: <code>%Y</code> (4-digit year), <code>%m</code> (month 01–12), <code>%d</code> (day). Combine with <code>GROUP BY</code> to aggregate by time period.</p>`,
        chips:[{t:"strftime('%Y-%m', date)",c:"chip-amber"},{t:"%Y %m %d",c:"chip-cyan"}],
        task:"Group employees by hire year and count how many were hired each year.",
        starter:"",
        solution:["strftime('%y', hire_date)","strftime('%Y', hire_date)"],
        hint:"SELECT strftime('%Y', hire_date) AS year, COUNT(*) FROM employees GROUP BY year", xp:25, tables:["employees"],
        exercises:[
          { id:"10.2.e1", prompt:"Show total order revenue grouped by year-month (format: YYYY-MM).", solution:["strftime('%y-%m', order_date)","strftime('%Y-%m', order_date)"], hint:"strftime('%Y-%m', order_date) AS month, SUM(total)", xp:8 },
          { id:"10.2.e2", prompt:"Count customer signups per month number (01 through 12) across all years.", solution:["strftime('%m', signup_date)"], hint:"strftime('%m', signup_date) AS month, COUNT(*)", xp:8 }
        ] },

      { id:"10.3", title:"Date Arithmetic", concept:"Date Math",
        theory:`<p><code>date(base, modifier)</code> applies date math. <code>date('now', '-5 years')</code> goes back 5 years. <code>date(hire_date, '+90 days')</code> adds 90 days to a column value. <code>julianday()</code> converts dates to a number for subtraction.</p>`,
        chips:[{t:"date('now', '-N years')",c:"chip-green"},{t:"julianday()",c:"chip-purple"}],
        task:"Find employees who have been with the company for more than 5 years.",
        starter:"",
        solution:["hire_date < date('now', '-5 years')","hire_date <= date('now', '-5 years')"],
        hint:"WHERE hire_date < date('now', '-5 years')", xp:25, tables:["employees"],
        exercises:[
          { id:"10.3.e1", prompt:"Find orders placed in the last 365 days from today.", solution:["order_date >= date('now', '-365 days')","order_date > date('now', '-365 days')"], hint:"WHERE order_date >= date('now', '-365 days')", xp:8 },
          { id:"10.3.e2", prompt:"Calculate the number of days each employee has been with the company.", solution:["julianday('now') - julianday(hire_date)","julianday(date('now')) - julianday(hire_date)"], hint:"julianday('now') - julianday(hire_date) AS days_employed", xp:10 }
        ] },

      { id:"10.4", title:"Time-Based Aggregations", concept:"Period Aggregation",
        theory:`<p>Combining <code>strftime</code> with <code>GROUP BY</code> enables time-series analytics — monthly revenue, daily signups, quarterly growth. This pattern is the backbone of every analytics dashboard.</p>`,
        chips:[{t:"GROUP BY strftime()",c:"chip-blue"},{t:"time series",c:"chip-green"}],
        task:"Show total order revenue and order count per month, ordered chronologically.",
        starter:"",
        solution:["strftime('%y-%m', order_date)","strftime('%Y-%m', order_date)","group by"],
        hint:"GROUP BY strftime('%Y-%m', order_date), then SUM(total) and COUNT(*)", xp:30, tables:["orders"],
        exercises:[
          { id:"10.4.e1", prompt:"Find the month with the highest total order revenue.", solution:["strftime('%y-%m', order_date)","strftime('%Y-%m', order_date)","sum(total)","order by","limit 1"], hint:"Group by month, SUM(total), ORDER BY total DESC LIMIT 1", xp:10 },
          { id:"10.4.e2", prompt:"Count customer signups per year and show cumulative growth using a window function.", solution:["strftime('%y', signup_date)","strftime('%Y', signup_date)","sum(count(","over (order by"], hint:"Use SUM(COUNT(*)) OVER (ORDER BY year) for a running total", xp:12 }
        ] }
    ]
  },
  {
    day: 11, title: "Advanced JOINs", lessons: [
      { id:"11.1", title:"CROSS JOIN", concept:"Cartesian Product",
        theory:`<p><code>CROSS JOIN</code> combines every row from table A with every row from table B — the Cartesian product. M rows × N rows = M×N result rows. Useful for generating all combinations, building test grids, or pairing every item with every category.</p>`,
        chips:[{t:"CROSS JOIN",c:"chip-amber"}],
        task:"Generate all possible pairings of employees and departments — every employee with every department.",
        starter:"",
        solution:["cross join"],
        hint:"SELECT e.first_name, d.dept_name FROM employees e CROSS JOIN departments d", xp:25, tables:["employees","departments"],
        exercises:[
          { id:"11.1.e1", prompt:"Generate all combinations of customer tiers and product categories using CROSS JOIN on subqueries.", solution:["cross join","select distinct tier","select distinct category"], hint:"SELECT * FROM (SELECT DISTINCT tier FROM customers) CROSS JOIN (SELECT DISTINCT category FROM products)", xp:10 },
          { id:"11.1.e2", prompt:"How many total rows does a CROSS JOIN of employees and departments produce? Write the query and check.", solution:["cross join","count(*)"], hint:"SELECT COUNT(*) FROM employees CROSS JOIN departments", xp:8 }
        ] },

      { id:"11.2", title:"SELF JOIN", concept:"Table Joins Itself",
        theory:`<p>A self-join joins a table to itself using two aliases. It's essential for hierarchical data — to find an employee's manager, you join <code>employees e</code> to <code>employees m</code> on <code>e.manager_id = m.id</code>. One table, two roles.</p>`,
        chips:[{t:"JOIN same_table",c:"chip-purple"},{t:"alias e, alias m",c:"chip-cyan"}],
        task:"Show each employee's first name alongside their manager's first name. Employees with no manager should show NULL.",
        starter:"",
        solution:["join employees m on e.manager_id = m.id","left join employees m on e.manager_id = m.id"],
        hint:"FROM employees e LEFT JOIN employees m ON e.manager_id = m.id", xp:35, tables:["employees"],
        exercises:[
          { id:"11.2.e1", prompt:"Find all employees who ARE managers (their id appears as someone else's manager_id).", solution:["where e.id in (select manager_id","join employees e2 on e.id = e2.manager_id"], hint:"WHERE id IN (SELECT DISTINCT manager_id FROM employees WHERE manager_id IS NOT NULL)", xp:10 },
          { id:"11.2.e2", prompt:"Count how many direct reports each manager has.", solution:["group by manager_id","count(*)","where manager_id is not null"], hint:"SELECT manager_id, COUNT(*) as direct_reports FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id", xp:12 }
        ] },

      { id:"11.3", title:"FULL OUTER JOIN", concept:"Both Sides Preserved",
        theory:`<p><code>FULL OUTER JOIN</code> returns all rows from both tables, with NULLs where there's no match on either side. Simulate it in older SQLite with <code>LEFT JOIN UNION ALL LEFT JOIN WHERE left IS NULL</code>. SQLite 3.39+ supports it natively.</p>`,
        chips:[{t:"FULL OUTER JOIN",c:"chip-red"},{t:"NULLs both sides",c:"chip-amber"}],
        task:"Show all employees and all departments, including employees with unknown departments and departments with no employees.",
        starter:"",
        solution:["full outer join","left join departments d on e.department = d.dept_name union","left join employees e on e.department = d.dept_name"],
        hint:"Try FULL OUTER JOIN, or simulate: LEFT JOIN UNION ALL (reverse LEFT JOIN WHERE e.id IS NULL)", xp:35, tables:["employees","departments"],
        exercises:[
          { id:"11.3.e1", prompt:"Show all customers and all orders, preserving customers with no orders and orders with no matching customer.", solution:["full outer join","left join orders","left join customers"], hint:"customers LEFT JOIN orders UNION ALL orders LEFT JOIN customers WHERE c.id IS NULL", xp:12 }
        ] },

      { id:"11.4", title:"Anti-Join Pattern", concept:"NOT EXISTS / NOT IN",
        theory:`<p>An anti-join finds rows in table A that have NO matching rows in table B. Use <code>NOT EXISTS</code> (preferred — handles NULLs correctly) or <code>NOT IN</code>. Classic use: "customers who have never placed an order."</p>`,
        chips:[{t:"NOT EXISTS (...)",c:"chip-red"},{t:"LEFT JOIN WHERE NULL",c:"chip-amber"}],
        task:"Find all customers who have never placed an order.",
        starter:"",
        solution:["not exists (select 1 from orders o where o.customer_id = c.id)","left join orders o on c.id = o.customer_id where o.id is null","c.id not in (select customer_id from orders)"],
        hint:"NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) is the cleanest approach", xp:35, tables:["customers","orders"],
        exercises:[
          { id:"11.4.e1", prompt:"Find departments that have no employees using an anti-join.", solution:["not exists (select 1 from employees e where e.department = d.dept_name)","left join employees e on e.department = d.dept_name where e.id is null"], hint:"NOT EXISTS (SELECT 1 FROM employees e WHERE e.department = d.dept_name)", xp:10 },
          { id:"11.4.e2", prompt:"Find products that have never been ordered.", solution:["not exists (select 1 from order_items oi where oi.product_id = p.id)","p.id not in (select product_id from order_items)"], hint:"NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)", xp:12 }
        ] }
    ]
  },
  {
    day: 12, title: "Set Operations", lessons: [
      { id:"12.1", title:"UNION vs UNION ALL", concept:"Combining Result Sets",
        theory:`<p><code>UNION</code> combines two result sets and removes duplicates. <code>UNION ALL</code> keeps everything including duplicates (and is faster). Both queries must have the same number of columns with compatible types.</p>`,
        chips:[{t:"UNION",c:"chip-blue"},{t:"UNION ALL",c:"chip-green"}],
        task:"Create a single list of all locations — cities from the customers table and locations from the departments table.",
        starter:"",
        solution:["union"],
        hint:"SELECT city FROM customers WHERE city IS NOT NULL UNION SELECT location FROM departments", xp:25, tables:["customers","departments"],
        exercises:[
          { id:"12.1.e1", prompt:"List all unique department names from both the employees and departments tables combined.", solution:["select department from employees","union","select dept_name from departments"], hint:"SELECT department FROM employees UNION SELECT dept_name FROM departments", xp:8 },
          { id:"12.1.e2", prompt:"Use UNION ALL to combine employee names and customer names into one list, keeping duplicates.", solution:["union all","select first_name from employees","select name from customers"], hint:"SELECT first_name AS name FROM employees UNION ALL SELECT name FROM customers", xp:8 }
        ] },

      { id:"12.2", title:"INTERSECT", concept:"Common Rows",
        theory:`<p><code>INTERSECT</code> returns only rows that appear in BOTH queries — the Venn diagram overlap. In analytics: "which users did X AND Y?" or "which items exist in both tables?"</p>`,
        chips:[{t:"INTERSECT",c:"chip-purple"}],
        task:"Find department names that appear in BOTH the departments table AND the employees department column (departments that actually have employees).",
        starter:"",
        solution:["intersect"],
        hint:"SELECT dept_name FROM departments INTERSECT SELECT department FROM employees", xp:25, tables:["employees","departments"],
        exercises:[
          { id:"12.2.e1", prompt:"Find countries that appear in both the customers table and that also have a city matching a department location.", solution:["intersect","select country from customers","select location from departments"], hint:"SELECT city FROM customers INTERSECT SELECT location FROM departments", xp:10 }
        ] },

      { id:"12.3", title:"EXCEPT", concept:"Set Subtraction",
        theory:`<p><code>EXCEPT</code> returns rows in the first query that do NOT appear in the second. Like set subtraction. Great for finding gaps — things that exist in one source but are missing from another.</p>`,
        chips:[{t:"EXCEPT",c:"chip-red"}],
        task:"Find departments (from the departments table) that have zero employees — they exist as a department but nobody works there.",
        starter:"",
        solution:["except"],
        hint:"SELECT dept_name FROM departments EXCEPT SELECT department FROM employees", xp:25, tables:["employees","departments"],
        exercises:[
          { id:"12.3.e1", prompt:"Find customer IDs that exist in the customers table but have NO orders.", solution:["except","select id from customers","select customer_id from orders"], hint:"SELECT id FROM customers EXCEPT SELECT customer_id FROM orders", xp:10 },
          { id:"12.3.e2", prompt:"Find products that have never appeared in any order (use EXCEPT).", solution:["except","select id from products","select product_id from order_items"], hint:"SELECT id FROM products EXCEPT SELECT product_id FROM order_items", xp:10 }
        ] },

      { id:"12.4", title:"Combining Set Operations", concept:"ORDER BY & LIMIT on Sets",
        theory:`<p>When combining set operations, <code>ORDER BY</code> and <code>LIMIT</code> apply to the final combined result. Wrap sub-results in CTEs if you need to sort or limit intermediate results before combining.</p>`,
        chips:[{t:"ORDER BY on combined",c:"chip-amber"},{t:"CTE + UNION",c:"chip-green"}],
        task:"Combine all unique cities from customers and department locations into one alphabetically sorted list, showing the top 8.",
        starter:"",
        solution:["union","order by","limit 8"],
        hint:"... UNION ... ORDER BY 1 LIMIT 8 — ORDER BY applies to the final combined result", xp:25, tables:["customers","departments"],
        exercises:[
          { id:"12.4.e1", prompt:"Union employee names and customer names, remove duplicates, sort alphabetically, and show the first 10.", solution:["union","order by","limit 10"], hint:"SELECT first_name FROM employees UNION SELECT name FROM customers ORDER BY 1 LIMIT 10", xp:10 }
        ] }
    ]
  },
  {
    day: 13, title: "Advanced Aggregations", lessons: [
      { id:"13.1", title:"GROUP_CONCAT", concept:"String Aggregation",
        theory:`<p><code>GROUP_CONCAT(col)</code> concatenates non-NULL values within a group into a single comma-separated string. Add a second argument to change the separator: <code>GROUP_CONCAT(name, ' | ')</code>. Perfect for producing lists instead of rows.</p>`,
        chips:[{t:"GROUP_CONCAT(col)",c:"chip-blue"},{t:"GROUP_CONCAT(col, sep)",c:"chip-cyan"}],
        task:"For each department, list all employee first names as a comma-separated string.",
        starter:"",
        solution:["group_concat(first_name)","group by department"],
        hint:"SELECT department, GROUP_CONCAT(first_name) FROM employees GROUP BY department", xp:25, tables:["employees"],
        exercises:[
          { id:"13.1.e1", prompt:"For each country, list all customer names separated by ' | '.", solution:["group_concat(name, ' | ')","group by country"], hint:"SELECT country, GROUP_CONCAT(name, ' | ') FROM customers GROUP BY country", xp:8 },
          { id:"13.1.e2", prompt:"For each order, list all product IDs ordered as a comma-separated string.", solution:["group_concat(product_id)","group by order_id"], hint:"SELECT order_id, GROUP_CONCAT(product_id) FROM order_items GROUP BY order_id", xp:10 }
        ] },

      { id:"13.2", title:"Conditional Aggregation", concept:"CASE Inside Aggregate",
        theory:`<p><code>SUM(CASE WHEN condition THEN 1 ELSE 0 END)</code> counts rows matching a condition within a GROUP BY — without needing a subquery or separate query. This is one of the most powerful and widely used SQL patterns in analytics.</p>`,
        chips:[{t:"SUM(CASE WHEN...)",c:"chip-green"},{t:"pivot without subquery",c:"chip-purple"}],
        task:"Show each department with two counts: employees earning above 90000 and those earning 90000 or below.",
        starter:"",
        solution:["sum(case when salary > 90000","sum(case when salary <= 90000","group by department"],
        hint:"SUM(CASE WHEN salary > 90000 THEN 1 ELSE 0 END) AS high_earners, SUM(CASE WHEN salary <= 90000 THEN 1 ELSE 0 END) AS others", xp:30, tables:["employees"],
        exercises:[
          { id:"13.2.e1", prompt:"For each customer, count completed and cancelled orders using conditional aggregation.", solution:["sum(case when status = 'completed'","sum(case when status = 'cancelled'","group by customer_id"], hint:"SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed", xp:10 },
          { id:"13.2.e2", prompt:"Show total revenue from Software products vs Hardware products vs Services in one row.", solution:["sum(case when category = 'software'","sum(case when category = 'hardware'","sum(case when category = 'services'"], hint:"JOIN order_items to products, then SUM(CASE WHEN category = '...' THEN quantity*unit_price ELSE 0 END)", xp:12 }
        ] },

      { id:"13.3", title:"COUNT DISTINCT", concept:"Unique Value Counts",
        theory:`<p><code>COUNT(DISTINCT col)</code> counts only unique values, ignoring duplicates. Essential for business metrics like "how many unique customers placed an order this month?" rather than "how many orders were placed?"</p>`,
        chips:[{t:"COUNT(DISTINCT col)",c:"chip-amber"}],
        task:"Show total orders placed and the number of distinct customers who placed them.",
        starter:"",
        solution:["count(distinct customer_id)"],
        hint:"SELECT COUNT(*) AS total_orders, COUNT(DISTINCT customer_id) AS unique_customers FROM orders", xp:25, tables:["orders"],
        exercises:[
          { id:"13.3.e1", prompt:"Count distinct products that have ever been ordered.", solution:["count(distinct product_id)"], hint:"SELECT COUNT(DISTINCT product_id) FROM order_items", xp:8 },
          { id:"13.3.e2", prompt:"Show the number of distinct customers per order status (completed, pending, cancelled).", solution:["count(distinct customer_id)","group by status"], hint:"SELECT status, COUNT(DISTINCT customer_id) FROM orders GROUP BY status", xp:10 }
        ] },

      { id:"13.4", title:"Multi-Column GROUP BY", concept:"Compound Grouping",
        theory:`<p>You can <code>GROUP BY</code> multiple columns, creating a group for each unique combination. <code>GROUP BY department, year</code> gives one row per department-year pair. Each non-aggregated column in SELECT must appear in GROUP BY.</p>`,
        chips:[{t:"GROUP BY a, b",c:"chip-blue"},{t:"unique combinations",c:"chip-cyan"}],
        task:"Count the number of employees in each department broken down by hire year.",
        starter:"",
        solution:["group by department","strftime('%y', hire_date)","strftime('%Y', hire_date)"],
        hint:"SELECT department, strftime('%Y', hire_date) AS year, COUNT(*) FROM employees GROUP BY department, year", xp:25, tables:["employees"],
        exercises:[
          { id:"13.4.e1", prompt:"Count orders per customer per status (one row per customer-status combination).", solution:["group by customer_id, status","group by customer_id","group by status"], hint:"SELECT customer_id, status, COUNT(*) FROM orders GROUP BY customer_id, status", xp:10 },
          { id:"13.4.e2", prompt:"Show total revenue per employee per year.", solution:["group by employee_id","strftime('%y', order_date)","strftime('%Y', order_date)","sum(total)"], hint:"SELECT employee_id, strftime('%Y', order_date) AS year, SUM(total) FROM orders GROUP BY employee_id, year", xp:12 }
        ] }
    ]
  },
  {
    day: 14, title: "Advanced Window Functions", lessons: [
      { id:"14.1", title:"DENSE_RANK vs RANK", concept:"Tie Handling",
        theory:`<p><code>RANK()</code> skips numbers after ties: 1, 1, 3. <code>DENSE_RANK()</code> never skips: 1, 1, 2. <code>ROW_NUMBER()</code> always assigns unique sequential numbers regardless of ties. Choosing the right one changes your results when duplicates exist.</p>`,
        chips:[{t:"DENSE_RANK()",c:"chip-blue"},{t:"RANK() skips",c:"chip-amber"},{t:"ROW_NUMBER() unique",c:"chip-green"}],
        task:"Show each employee's salary alongside their RANK and DENSE_RANK globally, so you can see the difference.",
        starter:"",
        solution:["dense_rank() over","rank() over"],
        hint:"SELECT first_name, salary, RANK() OVER (ORDER BY salary DESC), DENSE_RANK() OVER (ORDER BY salary DESC)", xp:30, tables:["employees"],
        exercises:[
          { id:"14.1.e1", prompt:"Rank employees within their department by salary using DENSE_RANK.", solution:["dense_rank() over (partition by department order by salary desc)"], hint:"DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)", xp:10 },
          { id:"14.1.e2", prompt:"Find the employee(s) who are DENSE_RANK = 2 in salary globally.", solution:["dense_rank() over (order by salary desc)","where","= 2"], hint:"Wrap in a CTE or subquery, then filter WHERE dense_rank = 2", xp:12 }
        ] },

      { id:"14.2", title:"NTILE — Bucketing Rows", concept:"Percentile Buckets",
        theory:`<p><code>NTILE(n)</code> divides rows into <em>n</em> roughly equal buckets and returns the bucket number (1 to n). <code>NTILE(4)</code> gives quartiles. <code>NTILE(10)</code> gives deciles. Used for customer segmentation, A/B testing, performance tiers.</p>`,
        chips:[{t:"NTILE(n)",c:"chip-purple"},{t:"quartiles, deciles",c:"chip-cyan"}],
        task:"Divide all employees into 4 salary quartiles. Quartile 1 = highest earners.",
        starter:"",
        solution:["ntile(4) over"],
        hint:"SELECT first_name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees", xp:30, tables:["employees"],
        exercises:[
          { id:"14.2.e1", prompt:"Divide customers into 3 groups (tertiles) by their total order spend.", solution:["ntile(3) over","sum(total)"], hint:"Use a subquery or CTE to get total spend, then NTILE(3) OVER (ORDER BY total_spend DESC)", xp:10 },
          { id:"14.2.e2", prompt:"Assign employees to salary deciles (10 groups).", solution:["ntile(10) over (order by salary"], hint:"NTILE(10) OVER (ORDER BY salary DESC) AS decile", xp:8 }
        ] },

      { id:"14.3", title:"FIRST_VALUE & LAST_VALUE", concept:"Frame Boundary Values",
        theory:`<p><code>FIRST_VALUE(col)</code> and <code>LAST_VALUE(col)</code> return the first and last values in the window frame. Use them to compare every row to the best or worst in its group without a self-join. Note: <code>LAST_VALUE</code> requires <code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code> to see the true last.</p>`,
        chips:[{t:"FIRST_VALUE(col)",c:"chip-green"},{t:"LAST_VALUE(col)",c:"chip-amber"},{t:"ROWS BETWEEN",c:"chip-cyan"}],
        task:"Show each employee, their salary, and the highest salary in their department (using FIRST_VALUE).",
        starter:"",
        solution:["first_value(salary) over (partition by department order by salary desc)"],
        hint:"FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS dept_max", xp:35, tables:["employees"],
        exercises:[
          { id:"14.3.e1", prompt:"Show each employee and the lowest salary in their department using FIRST_VALUE (order ASC).", solution:["first_value(salary) over (partition by department order by salary asc)"], hint:"FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary ASC) AS dept_min", xp:10 },
          { id:"14.3.e2", prompt:"Show each order alongside the first order date ever placed by that customer.", solution:["first_value(order_date) over (partition by customer_id order by order_date asc)"], hint:"FIRST_VALUE(order_date) OVER (PARTITION BY customer_id ORDER BY order_date ASC)", xp:12 }
        ] },

      { id:"14.4", title:"Moving Averages with ROWS BETWEEN", concept:"Rolling Windows",
        theory:`<p>The <code>ROWS BETWEEN</code> clause defines the window frame precisely. <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> creates a 3-row rolling window. Combine with <code>AVG()</code> to calculate moving averages — a core time-series analytics technique.</p>`,
        chips:[{t:"ROWS BETWEEN N PRECEDING",c:"chip-purple"},{t:"rolling average",c:"chip-green"}],
        task:"For employees ordered by salary, calculate a 3-row moving average salary (current row plus 2 preceding).",
        starter:"",
        solution:["rows between 2 preceding and current row"],
        hint:"AVG(salary) OVER (ORDER BY salary ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg", xp:35, tables:["employees"],
        exercises:[
          { id:"14.4.e1", prompt:"Calculate a 3-month rolling total of order revenue (ordered by order_date).", solution:["rows between 2 preceding and current row","sum(total) over"], hint:"SUM(total) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)", xp:12 },
          { id:"14.4.e2", prompt:"Use ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW to get a running total of salary.", solution:["rows between unbounded preceding and current row","sum(salary) over"], hint:"SUM(salary) OVER (ORDER BY hire_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)", xp:10 }
        ] }
    ]
  },
  {
    day: 15, title: "Recursive CTEs", lessons: [
      { id:"15.1", title:"Number Sequences", concept:"Recursive Basics",
        theory:`<p>Recursive CTEs have two parts joined by <code>UNION ALL</code>: an <strong>anchor</strong> (the starting row) and a <strong>recursive member</strong> (self-referencing query). The engine repeats the recursive member until it returns no rows. Start simple: generate a number sequence.</p>`,
        chips:[{t:"WITH RECURSIVE",c:"chip-blue"},{t:"anchor + recursive",c:"chip-purple"},{t:"UNION ALL",c:"chip-cyan"}],
        task:"Generate a sequence of integers from 1 to 10 using a recursive CTE.",
        starter:"",
        solution:["with recursive","union all","select n + 1","where n < 10"],
        hint:"WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM nums WHERE n < 10) SELECT n FROM nums", xp:40, tables:["employees"],
        exercises:[
          { id:"15.1.e1", prompt:"Generate numbers 1 to 20.", solution:["with recursive","where n < 20","select n + 1"], hint:"Same pattern, change WHERE n < 20", xp:8 },
          { id:"15.1.e2", prompt:"Generate even numbers from 2 to 20.", solution:["with recursive","select n + 2","where n < 20"], hint:"Start at 2, increment by 2: SELECT n+2 WHERE n < 20", xp:10 }
        ] },

      { id:"15.2", title:"Date Series Generation", concept:"Recursive Dates",
        theory:`<p>Generating a complete date series is critical for analytics — LEFT JOINing actual data onto it ensures every date appears even when no events occurred that day. Use <code>date(d, '+1 day')</code> to increment.</p>`,
        chips:[{t:"date(d, '+1 day')",c:"chip-green"},{t:"date spine",c:"chip-amber"}],
        task:"Generate all dates in January 2024 using a recursive CTE.",
        starter:"",
        solution:["with recursive","date('2024-01-01')","date(d, '+1 day')","where d < '2024-01-31'"],
        hint:"WITH RECURSIVE dates(d) AS (SELECT '2024-01-01' UNION ALL SELECT date(d,'+1 day') FROM dates WHERE d < '2024-01-31')", xp:40, tables:["orders"],
        exercises:[
          { id:"15.2.e1", prompt:"Generate the first 7 days of February 2024.", solution:["with recursive","date('2024-02-01')","where d < '2024-02-07'"], hint:"Start at '2024-02-01', increment, stop WHERE d < '2024-02-07'", xp:10 },
          { id:"15.2.e2", prompt:"Generate a date spine for all of 2024 (Jan 1 – Dec 31) and LEFT JOIN orders to show daily revenue (0 for missing days).", solution:["with recursive","left join orders","coalesce(sum(total), 0)"], hint:"Generate dates, then LEFT JOIN orders ON date_spine = order_date, COALESCE(SUM(total), 0)", xp:15 }
        ] },

      { id:"15.3", title:"Org Hierarchy Traversal", concept:"Tree Traversal",
        theory:`<p>The real power of recursive CTEs is traversing hierarchies — org charts, category trees, bill of materials. The anchor selects root nodes; the recursive member joins the next level down. Track <code>level</code> to know depth.</p>`,
        chips:[{t:"tree traversal",c:"chip-purple"},{t:"level depth",c:"chip-cyan"}],
        task:"Traverse the employee hierarchy starting from top-level managers (manager_id IS NULL). Show each employee and their level (1 = manager, 2 = their reports, etc.).",
        starter:"",
        solution:["with recursive","where manager_id is null","join employees","level + 1"],
        hint:"Anchor: WHERE manager_id IS NULL. Recursive: JOIN employees e ON e.manager_id = org.id, level+1", xp:45, tables:["employees"],
        exercises:[
          { id:"15.3.e1", prompt:"Show only level-2 employees (direct reports of top managers) using the recursive CTE.", solution:["with recursive","where manager_id is null","level + 1","where level = 2"], hint:"Build the recursive CTE as before, then filter WHERE level = 2", xp:12 },
          { id:"15.3.e2", prompt:"Find all employees who report (directly or indirectly) to Eve (id=5).", solution:["with recursive","where manager_id = 5","join employees e on e.manager_id"], hint:"Anchor: SELECT * FROM employees WHERE manager_id = 5. Recurse down.", xp:15 }
        ] }
    ]
  },
  {
    day: 16, title: "Data Cleaning & Quality", lessons: [
      { id:"16.1", title:"Finding Duplicates", concept:"Duplicate Detection",
        theory:`<p>Real data is messy. Find duplicates with <code>GROUP BY key HAVING COUNT(*) > 1</code>. This reveals rows where the same value appears more than once — the first step before any deduplication.</p>`,
        chips:[{t:"HAVING COUNT(*) > 1",c:"chip-red"}],
        task:"Find any first names that appear more than once in the employees table.",
        starter:"",
        solution:["group by first_name","having count(*) > 1"],
        hint:"SELECT first_name, COUNT(*) FROM employees GROUP BY first_name HAVING COUNT(*) > 1", xp:25, tables:["employees"],
        exercises:[
          { id:"16.1.e1", prompt:"Find customers who share the same country (countries with more than one customer).", solution:["group by country","having count(*) > 1"], hint:"SELECT country, COUNT(*) FROM customers GROUP BY country HAVING COUNT(*) > 1", xp:8 },
          { id:"16.1.e2", prompt:"Find any customers who have placed more than 3 orders (high-frequency buyers).", solution:["group by customer_id","having count(*) > 3"], hint:"SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id HAVING COUNT(*) > 3", xp:8 }
        ] },

      { id:"16.2", title:"Deduplication with ROW_NUMBER", concept:"Keep First Occurrence",
        theory:`<p>To keep only the first occurrence per duplicate group, use <code>ROW_NUMBER() OVER (PARTITION BY key ORDER BY id)</code> in a CTE, then <code>WHERE rn = 1</code> in the outer query. This is the standard deduplication pattern in data engineering.</p>`,
        chips:[{t:"ROW_NUMBER() dedup",c:"chip-green"},{t:"WHERE rn = 1",c:"chip-cyan"}],
        task:"Show only the earliest-hired employee per department (deduplicate by department, keep the oldest hire).",
        starter:"",
        solution:["row_number() over (partition by department order by hire_date)","where","= 1"],
        hint:"CTE: ROW_NUMBER() OVER (PARTITION BY department ORDER BY hire_date) AS rn. Outer: WHERE rn = 1", xp:30, tables:["employees"],
        exercises:[
          { id:"16.2.e1", prompt:"For each customer, keep only their most recent order (deduplicate by customer, keep latest order_date).", solution:["row_number() over (partition by customer_id order by order_date desc)","where","= 1"], hint:"ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn, WHERE rn = 1", xp:10 }
        ] },

      { id:"16.3", title:"Data Validation Queries", concept:"Quality Checks",
        theory:`<p>Write queries that CHECK data quality — orphaned foreign keys, out-of-range values, NULL counts, format violations. These validation queries are embedded in data pipelines to catch problems before they corrupt dashboards.</p>`,
        chips:[{t:"LEFT JOIN WHERE NULL",c:"chip-red"},{t:"quality assertions",c:"chip-amber"}],
        task:"Check data integrity: find any orders that reference a customer_id not present in the customers table (orphaned orders).",
        starter:"",
        solution:["left join customers","where c.id is null"],
        hint:"SELECT o.* FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE c.id IS NULL", xp:30, tables:["orders","customers"],
        exercises:[
          { id:"16.3.e1", prompt:"Find any order_items referencing a product_id that doesn't exist in the products table.", solution:["left join products","where p.id is null"], hint:"SELECT oi.* FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE p.id IS NULL", xp:10 },
          { id:"16.3.e2", prompt:"Find any orders with a total of 0 or a negative total — suspicious data.", solution:["where total <= 0","where total < 0 or total = 0"], hint:"WHERE total <= 0", xp:8 }
        ] },

      { id:"16.4", title:"NULL Imputation Patterns", concept:"Filling Missing Data",
        theory:`<p>When NULL data must be filled, common strategies are: replace with a constant, replace with the group mean, or propagate from adjacent rows. The choice depends on business context — never impute blindly.</p>`,
        chips:[{t:"COALESCE + subquery",c:"chip-purple"},{t:"group mean fill",c:"chip-green"}],
        task:"Show all customers, filling NULL cities with the most common city among customers in the same country.",
        starter:"",
        solution:["coalesce(c.city","where city is not null","group by country","order by count"],
        hint:"Subquery: find most common city per country. Outer: COALESCE(c.city, subquery_result)", xp:35, tables:["customers"],
        exercises:[
          { id:"16.4.e1", prompt:"Fill NULL emails with a generated placeholder: 'no-reply-' || id || '@company.com'.", solution:["coalesce(email, 'no-reply-' || id || '@company.com')","coalesce(email, 'no-reply-'"], hint:"COALESCE(email, 'no-reply-' || id || '@company.com')", xp:10 }
        ] }
    ]
  },
  {
    day: 17, title: "Pivoting Data", lessons: [
      { id:"17.1", title:"Manual Pivot with CASE WHEN", concept:"Rows to Columns",
        theory:`<p>SQL doesn't have a native PIVOT in SQLite, but you simulate it with <code>SUM(CASE WHEN category = 'X' THEN value ELSE 0 END)</code>. Each distinct value you want as a column becomes its own CASE WHEN expression. This produces a wide table from a tall one.</p>`,
        chips:[{t:"SUM(CASE WHEN...)",c:"chip-blue"},{t:"wide table",c:"chip-cyan"}],
        task:"Show total salary cost per department as separate columns: Engineering, Marketing, Finance, HR — all in one row.",
        starter:"",
        solution:["sum(case when department = 'engineering'","sum(case when department = 'marketing'"],
        hint:"SUM(CASE WHEN department = 'Engineering' THEN salary ELSE 0 END) AS engineering_cost, etc.", xp:30, tables:["employees"],
        exercises:[
          { id:"17.1.e1", prompt:"Show count of employees per department as separate columns in one row.", solution:["sum(case when department = 'engineering' then 1","count(case when department = 'engineering'"], hint:"SUM(CASE WHEN department = 'Engineering' THEN 1 ELSE 0 END) AS eng_count", xp:10 },
          { id:"17.1.e2", prompt:"Show total order revenue for completed, pending, and cancelled orders as three columns in one row.", solution:["sum(case when status = 'completed'","sum(case when status = 'pending'","sum(case when status = 'cancelled'"], hint:"Three SUM(CASE WHEN status = '...' THEN total ELSE 0 END) expressions", xp:12 }
        ] },

      { id:"17.2", title:"Year-over-Year Pivot", concept:"Time Period Columns",
        theory:`<p>Pivoting time periods into columns enables direct comparison. Instead of rows for 2022, 2023, 2024 you get three columns side by side. Combine <code>strftime</code> with <code>CASE WHEN</code> inside SUM to build it.</p>`,
        chips:[{t:"strftime + CASE",c:"chip-green"},{t:"YoY comparison",c:"chip-amber"}],
        task:"Show total order revenue for 2022, 2023, and 2024 as separate columns in a single summary row.",
        starter:"",
        solution:["sum(case when strftime('%y', order_date) = '22'","sum(case when strftime('%Y', order_date) = '2022'"],
        hint:"SUM(CASE WHEN strftime('%Y', order_date) = '2022' THEN total ELSE 0 END) AS rev_2022, etc.", xp:35, tables:["orders"],
        exercises:[
          { id:"17.2.e1", prompt:"Show order counts per quarter (Q1, Q2, Q3, Q4) across all years as four columns.", solution:["sum(case when strftime('%m', order_date) in ('01','02','03')","sum(case when strftime('%m',"], hint:"Q1: months 01-03. Q2: 04-06. Q3: 07-09. Q4: 10-12 using IN ()", xp:12 },
          { id:"17.2.e2", prompt:"Show each employee's salary and whether they were hired in 2019, 2020, or later — as separate boolean columns (1 or 0).", solution:["case when strftime('%y', hire_date) = '19'","case when strftime('%Y', hire_date) = '2019'"], hint:"CASE WHEN strftime('%Y', hire_date) = '2019' THEN 1 ELSE 0 END AS hired_2019", xp:10 }
        ] },

      { id:"17.3", title:"Unpivoting Data", concept:"Columns to Rows",
        theory:`<p>Unpivoting is the reverse — turning wide column-per-category data into tall rows. Use <code>UNION ALL</code> with hardcoded column references to stack the columns into rows with a 'category' and 'value' column.</p>`,
        chips:[{t:"UNION ALL unpivot",c:"chip-purple"},{t:"wide to tall",c:"chip-cyan"}],
        task:"The departments table has a single budget column. 'Unpivot' to produce rows showing (dept_name, metric_name, value) — one row per dept for budget, and one for the employee count from a join.",
        starter:"",
        solution:["union all","'budget'","'headcount'"],
        hint:"SELECT dept_name, 'budget' AS metric, budget AS value FROM departments UNION ALL SELECT ...", xp:30, tables:["employees","departments"],
        exercises:[
          { id:"17.3.e1", prompt:"Unpivot the employees table into (employee, attribute, value) rows for first_name, department, and salary.", solution:["union all","'first_name'","'department'","'salary'"], hint:"SELECT id, 'first_name' AS attr, first_name AS val FROM employees UNION ALL ...", xp:10 }
        ] }
    ]
  },
  {
    day: 18, title: "Cohort Analysis", lessons: [
      { id:"18.1", title:"Defining Cohorts", concept:"Cohort Assignment",
        theory:`<p>A cohort is a group of users who share a common starting event — usually signup month. Step 1 of any cohort analysis: assign each user to their cohort using <code>strftime('%Y-%m', signup_date)</code>. Step 2: track what they do afterward.</p>`,
        chips:[{t:"strftime cohort",c:"chip-blue"},{t:"signup month",c:"chip-green"}],
        task:"Count how many customers signed up in each cohort (year-month), ordered chronologically.",
        starter:"",
        solution:["strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)","group by"],
        hint:"SELECT strftime('%Y-%m', signup_date) AS cohort, COUNT(*) FROM customers GROUP BY cohort ORDER BY cohort", xp:35, tables:["customers"],
        exercises:[
          { id:"18.1.e1", prompt:"Show the count of customers per tier per cohort year.", solution:["strftime('%y', signup_date)","strftime('%Y', signup_date)","group by","tier"], hint:"GROUP BY strftime('%Y', signup_date), tier", xp:10 },
          { id:"18.1.e2", prompt:"Find which signup cohort has the highest proportion of Enterprise customers.", solution:["strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)","sum(case when tier = 'enterprise'"], hint:"Use conditional aggregation: SUM(CASE WHEN tier='Enterprise' THEN 1 ELSE 0 END) / COUNT(*)", xp:12 }
        ] },

      { id:"18.2", title:"First Purchase by Cohort", concept:"Activation Analysis",
        theory:`<p>Joining cohort data to first-purchase events reveals activation quality — how quickly (or whether) new users convert to customers. Use <code>MIN(order_date)</code> to find each customer's first order, then join to their signup cohort.</p>`,
        chips:[{t:"MIN(date) = first event",c:"chip-amber"},{t:"LEFT JOIN preserves",c:"chip-green"}],
        task:"For each customer, show their signup cohort and first order date. Include customers who have never ordered.",
        starter:"",
        solution:["min(order_date)","left join orders","strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)"],
        hint:"LEFT JOIN to keep all customers. GROUP BY customer to get MIN(order_date)", xp:35, tables:["customers","orders"],
        exercises:[
          { id:"18.2.e1", prompt:"Calculate the average number of days from signup to first order, per cohort.", solution:["avg(julianday(min(order_date)) - julianday(signup_date))","strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)"], hint:"AVG(julianday(MIN(order_date)) - julianday(signup_date)) per cohort", xp:12 },
          { id:"18.2.e2", prompt:"Show conversion rate per cohort: what % of customers placed at least one order.", solution:["count(distinct o.customer_id)","count(distinct c.id)","strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)"], hint:"COUNT(DISTINCT o.customer_id) / COUNT(DISTINCT c.id) * 100", xp:15 }
        ] },

      { id:"18.3", title:"Cohort Retention", concept:"Return Rate",
        theory:`<p>Retention asks: did a cohort member come back? The simplest metric: what % of each cohort placed more than one order? More advanced: did they order in the month after signup? Retention analysis is the single most important metric for a subscription or repeat-purchase business.</p>`,
        chips:[{t:"HAVING COUNT > 1",c:"chip-purple"},{t:"cohort × period",c:"chip-cyan"}],
        task:"For each signup cohort, count total customers and how many placed at least 2 orders. Show retention rate.",
        starter:"",
        solution:["strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)","having count(o.id) >= 2","count(distinct o.customer_id)"],
        hint:"JOIN customers to orders, GROUP BY cohort. HAVING COUNT(o.id) >= 2 counts retained customers", xp:40, tables:["customers","orders"],
        exercises:[
          { id:"18.3.e1", prompt:"Show which cohort has the highest average number of orders per customer.", solution:["count(o.id)","strftime('%y-%m', signup_date)","strftime('%Y-%m', signup_date)","group by cohort","order by"], hint:"COUNT(o.id) / COUNT(DISTINCT c.id) per cohort, ORDER BY desc", xp:12 }
        ] }
    ]
  },
  {
    day: 19, title: "Funnel & Retention", lessons: [
      { id:"19.1", title:"Conversion Funnels", concept:"Step-by-Step Drop-off",
        theory:`<p>A funnel measures drop-off at each step of a user journey. In e-commerce: how many orders were placed → how many completed → conversion rate. Conditional aggregation lets you compute all funnel steps in a single query.</p>`,
        chips:[{t:"funnel steps",c:"chip-blue"},{t:"conversion rate",c:"chip-green"}],
        task:"Show total orders, completed orders, and completion rate (%) from the orders table.",
        starter:"",
        solution:["count(*)","sum(case when status = 'completed'","round(","100.0"],
        hint:"ROUND(SUM(CASE WHEN status='completed' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) AS completion_pct", xp:35, tables:["orders"],
        exercises:[
          { id:"19.1.e1", prompt:"Show the funnel breakdown by status with counts and percentages for each status.", solution:["group by status","count(*)","round(count(*) * 100.0"], hint:"SELECT status, COUNT(*), ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 1) AS pct FROM orders GROUP BY status", xp:12 },
          { id:"19.1.e2", prompt:"Show the completion rate per employee (what % of their orders were completed).", solution:["sum(case when status = 'completed'","group by employee_id","round("], hint:"GROUP BY employee_id, then conditional aggregation for completion rate", xp:12 }
        ] },

      { id:"19.2", title:"Repeat Buyer Retention", concept:"Returning Customers",
        theory:`<p>Retention rate = customers who bought again / total buying customers. Identify one-time vs repeat buyers with <code>COUNT(orders) > 1</code>. High repeat purchase rate is a strong signal of product-market fit.</p>`,
        chips:[{t:"HAVING COUNT > 1",c:"chip-amber"},{t:"repeat vs one-time",c:"chip-purple"}],
        task:"Of all customers who placed at least one order, what percentage placed more than one order?",
        starter:"",
        solution:["count(distinct customer_id)","having count(*) > 1"],
        hint:"Compare COUNT of customers with >1 order to total customers who ever ordered", xp:35, tables:["orders"],
        exercises:[
          { id:"19.2.e1", prompt:"Find customers who placed orders in ALL three years: 2022, 2023, and 2024.", solution:["count(distinct strftime('%y', order_date)) = 3","count(distinct strftime('%Y', order_date)) = 3"], hint:"GROUP BY customer_id HAVING COUNT(DISTINCT strftime('%Y', order_date)) = 3", xp:12 },
          { id:"19.2.e2", prompt:"Show a breakdown: how many customers placed exactly 1 order, exactly 2, exactly 3, and 4+.", solution:["case when count(*) = 1 then '1 order'","case when count(*) = 2","count(distinct customer_id)"], hint:"GROUP BY customer_id to get order count, then wrap in outer query with CASE WHEN", xp:15 }
        ] },

      { id:"19.3", title:"Time to Second Purchase", concept:"Engagement Speed",
        theory:`<p>Days between first and second purchase is a key engagement metric — faster return = more engaged customer. Find first and second orders per customer using <code>ROW_NUMBER()</code>, then join the two rows and subtract dates using <code>julianday()</code>.</p>`,
        chips:[{t:"ROW_NUMBER() per customer",c:"chip-green"},{t:"julianday diff",c:"chip-cyan"}],
        task:"For each customer with at least 2 orders, calculate the number of days between their first and second order.",
        starter:"",
        solution:["row_number() over (partition by customer_id order by order_date)","julianday","where rn = 2"],
        hint:"CTE: ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date). Join rn=1 to rn=2, subtract julianday", xp:40, tables:["orders"],
        exercises:[
          { id:"19.3.e1", prompt:"Find the customer with the fastest return (fewest days between first and second order).", solution:["row_number() over (partition by customer_id order by order_date)","julianday","order by","limit 1"], hint:"Build the first→second order diff, then ORDER BY days_to_return ASC LIMIT 1", xp:12 }
        ] }
    ]
  },
  {
    day: 20, title: "Business Metrics & KPIs", lessons: [
      { id:"20.1", title:"Revenue Metrics", concept:"Core Revenue KPIs",
        theory:`<p>The foundational revenue metrics: Total Revenue (<code>SUM(total)</code>), Number of Orders (<code>COUNT(*)</code>), Average Order Value (AOV = Total / Count), Revenue per Customer. Always filter on <code>status = 'completed'</code> — pending/cancelled orders aren't earned revenue.</p>`,
        chips:[{t:"SUM / COUNT = AOV",c:"chip-blue"},{t:"completed only",c:"chip-green"}],
        task:"From completed orders only: show total revenue, order count, unique customers, and average order value.",
        starter:"",
        solution:["sum(total)","count(distinct customer_id)","where status = 'completed'"],
        hint:"Filter WHERE status = 'completed', then SUM(total), COUNT(*), COUNT(DISTINCT customer_id), SUM/COUNT for AOV", xp:30, tables:["orders"],
        exercises:[
          { id:"20.1.e1", prompt:"Calculate total revenue by product category (join orders → order_items → products).", solution:["join order_items","join products","sum(quantity * unit_price)","group by category"], hint:"JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id, GROUP BY p.category", xp:12 },
          { id:"20.1.e2", prompt:"Find the average order value per customer tier.", solution:["join customers","avg(total)","group by tier"], hint:"JOIN orders to customers, AVG(total) GROUP BY tier", xp:10 }
        ] },

      { id:"20.2", title:"Customer Lifetime Value", concept:"CLV",
        theory:`<p>Customer Lifetime Value (CLV) = total revenue a customer has generated. Simple CLV = <code>SUM(order total)</code> per customer. Rank customers to identify your most valuable accounts and understand what high-CLV customers have in common.</p>`,
        chips:[{t:"SUM per customer",c:"chip-amber"},{t:"ranked CLV",c:"chip-purple"}],
        task:"Calculate total lifetime spend per customer, show their tier, and rank from highest to lowest.",
        starter:"",
        solution:["sum(total)","join customers","group by o.customer_id","order by","desc"],
        hint:"JOIN orders to customers, SUM(o.total) GROUP BY customer, ORDER BY clv DESC", xp:30, tables:["customers","orders"],
        exercises:[
          { id:"20.2.e1", prompt:"Find the top 3 customers by lifetime value.", solution:["sum(total)","group by","order by","desc","limit 3"], hint:"SUM(total) per customer, ORDER BY desc, LIMIT 3", xp:8 },
          { id:"20.2.e2", prompt:"Show average CLV per tier — which tier generates the most value per customer?", solution:["avg(customer_total)","group by tier"], hint:"CTE to get SUM(total) per customer with their tier, then AVG outer query GROUP BY tier", xp:12 }
        ] },

      { id:"20.3", title:"Month-over-Month Growth", concept:"Period-over-Period",
        theory:`<p>Period-over-period comparison uses <code>LAG()</code> to access the previous period's value, then computes percentage change. This pattern is universal — MoM revenue, WoW users, YoY orders. The formula: <code>(current - previous) / previous * 100</code>.</p>`,
        chips:[{t:"LAG() previous period",c:"chip-green"},{t:"(cur-prev)/prev*100",c:"chip-cyan"}],
        task:"Calculate monthly order revenue and month-over-month growth percentage.",
        starter:"",
        solution:["lag(","over (order by","strftime('%y-%m'","strftime('%Y-%m'"],
        hint:"CTE for monthly revenue, then LAG(revenue) OVER (ORDER BY month), then (cur-lag)/lag*100", xp:40, tables:["orders"],
        exercises:[
          { id:"20.3.e1", prompt:"Calculate year-over-year total revenue growth from 2022 to 2023 to 2024.", solution:["strftime('%y', order_date)","strftime('%Y', order_date)","sum(total)","lag(","over (order by"], hint:"Group by year, get SUM(total), then LAG(total) OVER (ORDER BY year)", xp:12 }
        ] },

      { id:"20.4", title:"RFM Segmentation", concept:"Recency Frequency Monetary",
        theory:`<p>RFM (Recency, Frequency, Monetary) is the classic customer segmentation framework. Score each customer on: <strong>R</strong>ecency (days since last order), <strong>F</strong>requency (order count), <strong>M</strong>onetary (total spend). Use <code>NTILE(3)</code> to assign scores 1–3 on each axis.</p>`,
        chips:[{t:"MAX(date) = recency",c:"chip-amber"},{t:"NTILE(3) scores",c:"chip-purple"},{t:"RFM",c:"chip-blue"}],
        task:"Calculate Recency (days since last order), Frequency (order count), and Monetary (total spend) for each customer.",
        starter:"",
        solution:["max(order_date)","count(*)","sum(total)","group by customer_id"],
        hint:"SELECT customer_id, julianday('now')-julianday(MAX(order_date)) AS recency, COUNT(*) AS frequency, SUM(total) AS monetary FROM orders GROUP BY customer_id", xp:35, tables:["customers","orders"],
        exercises:[
          { id:"20.4.e1", prompt:"Extend the RFM query: use NTILE(3) on each dimension to produce R_score, F_score, M_score (3=best).", solution:["ntile(3) over (order by","sum(total)","count(*)"], hint:"Wrap RFM base in a CTE, then NTILE(3) OVER (ORDER BY recency ASC) for R (lower recency = better), etc.", xp:15 },
          { id:"20.4.e2", prompt:"Label customers as 'Champions' (all 3 scores = 3), 'Churned' (recency score = 1), or 'Regular'.", solution:["case when","ntile(3)","= 3","= 1"], hint:"Add RFM scores with NTILE, then CASE WHEN r_score=3 AND f_score=3 AND m_score=3 THEN 'Champions'", xp:15 }
        ] }
    ]
  },
  {
    day: 21, title: "Capstone — Analytics Engineering", lessons: [
      { id:"21.1", title:"Executive Revenue Dashboard", concept:"Multi-Metric Single Query",
        theory:`<p>Analytics engineers produce single queries that give leadership all the numbers they need in one result set — no spreadsheet formulas, no manual joins. Master the pattern of computing multiple KPIs (total, average, count, growth) in a single query using CTEs and conditional aggregation.</p>`,
        chips:[{t:"CTE pipeline",c:"chip-blue"},{t:"all KPIs in one",c:"chip-green"}],
        task:"Build a single query showing: total completed revenue, order count, unique customers, AOV, and 2023 vs 2024 revenue comparison — all in one row.",
        starter:"",
        solution:["sum(total)","count(distinct customer_id)","strftime('%y', order_date)","strftime('%Y', order_date)","where status = 'completed'"],
        hint:"Use conditional aggregation: SUM(CASE WHEN strftime('%Y')='2023'...) and same for 2024, plus total aggregates", xp:60, tables:["orders","customers"],
        exercises:[
          { id:"21.1.e1", prompt:"Add the top-selling product name to your dashboard (most units sold).", solution:["join order_items","join products","sum(quantity)","order by","limit 1"], hint:"Subquery: SELECT name FROM products JOIN order_items ... GROUP BY product_id ORDER BY SUM(quantity) DESC LIMIT 1", xp:15 }
        ] },

      { id:"21.2", title:"Product Performance Report", concept:"Product Scorecard",
        theory:`<p>A product report answers: which products drive the most revenue? highest volume? best margin proxy? Join <code>order_items</code> to <code>products</code> and aggregate by product to build the scorecard. Add rankings to identify your top performers.</p>`,
        chips:[{t:"order_items → products",c:"chip-amber"},{t:"RANK() per category",c:"chip-purple"}],
        task:"For each product: total quantity sold, total revenue, average unit price, and rank within its category by revenue.",
        starter:"",
        solution:["join products","sum(quantity)","sum(quantity * unit_price)","rank() over (partition by category order by sum(quantity * unit_price) desc)"],
        hint:"JOIN order_items to products, GROUP BY product, then RANK() OVER (PARTITION BY category ORDER BY SUM(qty*price) DESC)", xp:60, tables:["order_items","products"],
        exercises:[
          { id:"21.2.e1", prompt:"Find the single top product in each category by total revenue.", solution:["rank() over (partition by category order by sum(quantity * unit_price) desc)","where","= 1"], hint:"Wrap in CTE, filter WHERE category_rank = 1", xp:15 }
        ] },

      { id:"21.3", title:"Customer Segmentation Pipeline", concept:"CTE Chain",
        theory:`<p>Real segmentation pipelines classify every customer into a segment based on their behaviour — using CTEs to build the logic step by step, so each layer is readable and testable before feeding the next. This is exactly how dbt models are structured.</p>`,
        chips:[{t:"chained CTEs",c:"chip-blue"},{t:"CASE WHEN segment",c:"chip-green"},{t:"dbt pattern",c:"chip-purple"}],
        task:"Using CTEs: classify customers as 'Champions' (3+ orders and $1000+ spend), 'Loyal' (2+ orders), 'At Risk' (1 order only), or 'New' (no orders yet).",
        starter:"",
        solution:["with","as (","case when","count(","sum(total)","join orders"],
        hint:"CTE 1: aggregate orders per customer. CTE 2: LEFT JOIN customers. Final: CASE WHEN on order count and total", xp:80, tables:["customers","orders"],
        exercises:[
          { id:"21.3.e1", prompt:"Extend the segmentation: add a column showing each customer's RFM score (R+F+M each scored 1-3).", solution:["ntile(3)","with","case when"], hint:"Add a CTE that computes NTILE scores, then combine with the segmentation logic", xp:20 }
        ] },

      { id:"21.4", title:"Full Analytics Pipeline", concept:"End-to-End Query",
        theory:`<p>This is what an analytics engineer does every day: chain CTEs, join across all tables, compute business metrics, and produce a clean, documented result set ready for a BI tool. Every query you've written in this course is a building block for this.</p>`,
        chips:[{t:"full pipeline",c:"chip-blue"},{t:"JOIN all tables",c:"chip-green"},{t:"window + agg + case",c:"chip-purple"}],
        task:"Build a complete pipeline: (1) monthly revenue per sales employee, (2) add their department and budget, (3) rank within department by monthly revenue, (4) flag top-2 per department as 'Top Performer'.",
        starter:"",
        solution:["with","strftime('%y-%m'","strftime('%Y-%m'","rank() over (partition by","case when","join departments"],
        hint:"CTE 1: monthly sales per employee. CTE 2: JOIN departments. CTE 3: RANK() per dept per month. Final: CASE WHEN rank <= 2", xp:100, tables:["employees","departments","orders"],
        exercises:[
          { id:"21.4.e1", prompt:"Extend the pipeline: add a column showing each employee's % share of their department's monthly revenue.", solution:["sum(total) over (partition by","department","strftime('%y-%m'","strftime('%Y-%m'"], hint:"Add SUM(monthly_revenue) OVER (PARTITION BY department, month) as the department total, then divide", xp:20 }
        ] }
    ]
  },
  {
    day: 22, title: "DDL & Changing Data", lessons: [
      { id:"22.1", title:"CREATE TABLE & Constraints", concept:"DDL",
        theory:`<p>So far you've only read data. Data engineers also <em>define</em> it. DDL (Data Definition Language) creates and alters structures: <code>CREATE TABLE</code>, <code>DROP TABLE</code>, <code>ALTER TABLE</code>.</p><p>Constraints are rules the database enforces for you: <code>PRIMARY KEY</code> (unique row identity), <code>NOT NULL</code>, <code>UNIQUE</code>, <code>CHECK</code> (custom rule), and <code>DEFAULT</code>. Good engineers push rules into the schema — bad data gets rejected at the door instead of cleaned up later.</p><p>Tip: start scripts with <code>DROP TABLE IF EXISTS</code> so they can be re-run safely. If anything gets messy, the <strong>↺ Reset data</strong> button rebuilds the practice database.</p>`,
        chips:[{t:"CREATE TABLE",c:"chip-blue"},{t:"PRIMARY KEY",c:"chip-amber"},{t:"NOT NULL",c:"chip-green"},{t:"CHECK",c:"chip-purple"},{t:"DEFAULT",c:"chip-cyan"}],
        task:"Create a table named certifications with: id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL, name TEXT NOT NULL, and score INTEGER with a CHECK that it's between 0 and 100. Insert at least one row, then SELECT * from it.",
        starter:"-- A worked example: run it, then write your own table below\nDROP TABLE IF EXISTS projects;\nCREATE TABLE projects (\n  id INTEGER PRIMARY KEY,\n  title TEXT NOT NULL,\n  dept TEXT DEFAULT 'Engineering',\n  hours INTEGER CHECK (hours > 0)\n);\nINSERT INTO projects (title, hours) VALUES ('Data Warehouse v2', 120);\nSELECT * FROM projects;",
        solution:["create table certifications"],
        hint:"CREATE TABLE certifications (id INTEGER PRIMARY KEY, employee_id INTEGER NOT NULL, name TEXT NOT NULL, score INTEGER CHECK(score BETWEEN 0 AND 100)); then INSERT and SELECT", xp:30, tables:["employees"],
        exercises:[
          { id:"22.1.e1", prompt:"Create a table budgets_2025 with columns dept_name TEXT and amount INTEGER. Insert one row: 'Engineering', 2500000. Then SELECT * from it.",
            validate:{ rowCount:1, hasCols:["dept_name","amount"] },
            _ref:"DROP TABLE IF EXISTS budgets_2025; CREATE TABLE budgets_2025 (dept_name TEXT, amount INTEGER); INSERT INTO budgets_2025 VALUES ('Engineering', 2500000); SELECT * FROM budgets_2025;",
            hint:"CREATE TABLE budgets_2025 (dept_name TEXT, amount INTEGER); INSERT INTO budgets_2025 VALUES ('Engineering', 2500000); SELECT * FROM budgets_2025;", xp:8 },
          { id:"22.1.e2", prompt:"Use CREATE TABLE ... AS SELECT to snapshot all Engineering employees into a table named eng_team, then SELECT everything from it.",
            validate:{ rowCount:5, hasCol:"first_name" },
            _ref:"DROP TABLE IF EXISTS eng_team; CREATE TABLE eng_team AS SELECT * FROM employees WHERE department = 'Engineering'; SELECT * FROM eng_team;",
            hint:"CREATE TABLE eng_team AS SELECT * FROM employees WHERE department = 'Engineering'; then SELECT * FROM eng_team;", xp:8 }
        ] },

      { id:"22.2", title:"INSERT, UPDATE, DELETE", concept:"DML",
        theory:`<p>DML (Data Manipulation Language) changes rows: <code>INSERT</code> adds, <code>UPDATE</code> modifies, <code>DELETE</code> removes. The most important habit in your career: <strong>never run UPDATE or DELETE without a WHERE clause</strong> — without one, every row changes.</p><p>Pros test destructive changes on a copy first. <code>CREATE TABLE copy AS SELECT ...</code> gives you a scratch table; run the change there, check it with a SELECT, and only then run it for real.</p>`,
        chips:[{t:"INSERT INTO",c:"chip-green"},{t:"UPDATE ... SET",c:"chip-amber"},{t:"DELETE FROM",c:"chip-red"},{t:"WHERE or regret",c:"chip-purple"}],
        task:"Copy employees into a scratch table named staff. Give everyone in Engineering a 10% raise with UPDATE. Then SELECT first_name and salary for Engineering staff to verify.",
        starter:"-- Work on a copy, never the original\nDROP TABLE IF EXISTS staff;\nCREATE TABLE staff AS SELECT * FROM employees;\n\n-- Now UPDATE Engineering salaries by 10%, then SELECT to verify\n",
        solution:["update staff set salary"],
        hint:"UPDATE staff SET salary = salary * 1.1 WHERE department = 'Engineering'; then SELECT first_name, salary FROM staff WHERE department = 'Engineering';", xp:30, tables:["employees"],
        exercises:[
          { id:"22.2.e1", prompt:"Copy customers into a table named crm, DELETE every row where email IS NULL, then SELECT the remaining rows.",
            validate:{ rowCount:12 },
            _ref:"DROP TABLE IF EXISTS crm; CREATE TABLE crm AS SELECT * FROM customers; DELETE FROM crm WHERE email IS NULL; SELECT * FROM crm;",
            hint:"DELETE FROM crm WHERE email IS NULL; — three customers have no email", xp:8 },
          { id:"22.2.e2", prompt:"Copy products into a table named catalog, raise every Software price by 50, then SELECT name and price for Software products.",
            validate:{ rowCount:4, hasCols:["name","price"] },
            _ref:"DROP TABLE IF EXISTS catalog; CREATE TABLE catalog AS SELECT * FROM products; UPDATE catalog SET price = price + 50 WHERE category = 'Software'; SELECT name, price FROM catalog WHERE category = 'Software';",
            hint:"UPDATE catalog SET price = price + 50 WHERE category = 'Software';", xp:8 }
        ] },

      { id:"22.3", title:"Transactions & UPSERT", concept:"Atomic Changes",
        theory:`<p>A transaction makes several statements succeed or fail <em>together</em>: <code>BEGIN</code> ... <code>COMMIT</code> (or <code>ROLLBACK</code> to undo). Pipelines wrap loads in transactions so a crash halfway never leaves half-written data.</p><p>An <strong>upsert</strong> is insert-or-update in one statement: <code>INSERT ... ON CONFLICT(key) DO UPDATE SET ...</code>. It's the backbone of idempotent pipelines — run the load twice, get the same result.</p>`,
        chips:[{t:"BEGIN / COMMIT",c:"chip-blue"},{t:"ROLLBACK",c:"chip-red"},{t:"ON CONFLICT",c:"chip-amber"},{t:"upsert",c:"chip-green"}],
        task:"Create a table inventory (product_id INTEGER PRIMARY KEY, stock INTEGER). Insert product 1 with stock 10. Then upsert product 1 again with stock 25 using ON CONFLICT. SELECT the table — one row, stock 25.",
        starter:"DROP TABLE IF EXISTS inventory;\nCREATE TABLE inventory (product_id INTEGER PRIMARY KEY, stock INTEGER);\n\nINSERT INTO inventory VALUES (1, 10);\n\n-- Now upsert the same product with new stock using ON CONFLICT,\n-- then SELECT * FROM inventory;\n",
        solution:["on conflict"],
        hint:"INSERT INTO inventory VALUES (1, 25) ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock;", xp:35, tables:["products"],
        exercises:[
          { id:"22.3.e1", prompt:"Using the inventory pattern: create it fresh, upsert product 7 twice (stock 5, then stock 12), then SELECT — you should see exactly one row with stock 12.",
            validate:{ rowCount:1, hasValue:12 },
            _ref:"DROP TABLE IF EXISTS inventory; CREATE TABLE inventory (product_id INTEGER PRIMARY KEY, stock INTEGER); INSERT INTO inventory VALUES (7, 5) ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock; INSERT INTO inventory VALUES (7, 12) ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock; SELECT * FROM inventory;",
            hint:"Run the same INSERT ... ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock twice with different stock values", xp:10 },
          { id:"22.3.e2", prompt:"Wrap two inserts into a fresh audit_log(msg TEXT) table inside BEGIN ... COMMIT, then SELECT the rows.",
            validate:{ rowCount:2, hasCol:"msg" },
            _ref:"DROP TABLE IF EXISTS audit_log; CREATE TABLE audit_log (msg TEXT); BEGIN; INSERT INTO audit_log VALUES ('load started'); INSERT INTO audit_log VALUES ('load finished'); COMMIT; SELECT * FROM audit_log;",
            hint:"BEGIN; INSERT ...; INSERT ...; COMMIT; SELECT * FROM audit_log;", xp:8 }
        ] }
    ]
  },
  {
    day: 23, title: "Views & Layered Models", lessons: [
      { id:"23.1", title:"CREATE VIEW", concept:"Views",
        theory:`<p>A view is a saved query that behaves like a table: <code>CREATE VIEW name AS SELECT ...</code>. Query it like any table — the SQL underneath runs each time.</p><p>Views are how teams share business logic. Define "active customer" once in a view, and every report uses the same definition. Change it in one place, every consumer updates.</p>`,
        chips:[{t:"CREATE VIEW",c:"chip-blue"},{t:"saved query",c:"chip-cyan"},{t:"DROP VIEW",c:"chip-red"}],
        task:"Create a view v_active_customers containing customers who have placed at least one order. Then SELECT * from the view.",
        starter:"-- Views wrap a query behind a name\nDROP VIEW IF EXISTS v_active_customers;\n-- CREATE VIEW v_active_customers AS SELECT ... ;\n-- SELECT * FROM v_active_customers;\n",
        solution:["create view v_active_customers"],
        hint:"CREATE VIEW v_active_customers AS SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders);", xp:30, tables:["customers","orders"],
        exercises:[
          { id:"23.1.e1", prompt:"Create a view v_big_orders with all orders whose total is 1000 or more, then SELECT * from it.",
            validate:{ minRows:1, hasCols:["id","total"] },
            _ref:"DROP VIEW IF EXISTS v_big_orders; CREATE VIEW v_big_orders AS SELECT * FROM orders WHERE total >= 1000; SELECT * FROM v_big_orders;",
            hint:"CREATE VIEW v_big_orders AS SELECT * FROM orders WHERE total >= 1000;", xp:8 },
          { id:"23.1.e2", prompt:"Create a view v_headcount showing each department and its number of employees, then SELECT from it.",
            validate:{ rowCount:4, colCount:2 },
            _ref:"DROP VIEW IF EXISTS v_headcount; CREATE VIEW v_headcount AS SELECT department, COUNT(*) AS headcount FROM employees GROUP BY department; SELECT * FROM v_headcount;",
            hint:"CREATE VIEW v_headcount AS SELECT department, COUNT(*) AS headcount FROM employees GROUP BY department;", xp:8 }
        ] },

      { id:"23.2", title:"Staging → Marts (the dbt pattern)", concept:"Layered Models",
        theory:`<p>Production warehouses are built in layers, exactly like dbt projects: <strong>staging</strong> views (<code>stg_</code>) clean and rename raw data — nothing else; <strong>mart</strong> views (<code>mart_</code>) build business metrics on top of staging.</p><p>Why layers? Each step is small, testable, and reusable. When raw data changes shape, you fix one staging view instead of fifty reports.</p>`,
        chips:[{t:"stg_ views",c:"chip-cyan"},{t:"mart_ views",c:"chip-purple"},{t:"dbt mindset",c:"chip-green"}],
        task:"Build two layers: a view stg_orders with only completed orders (keep id, customer_id, order_date, total), then a view mart_customer_revenue on top of it showing customer_id and their total revenue. SELECT from the mart.",
        starter:"-- Layer 1: staging (clean + filter)\nDROP VIEW IF EXISTS stg_orders;\nDROP VIEW IF EXISTS mart_customer_revenue;\n\n-- CREATE VIEW stg_orders AS ... ;\n-- CREATE VIEW mart_customer_revenue AS SELECT ... FROM stg_orders ... ;\n-- SELECT * FROM mart_customer_revenue;\n",
        solution:["create view mart_customer_revenue"],
        hint:"CREATE VIEW stg_orders AS SELECT id, customer_id, order_date, total FROM orders WHERE status = 'completed'; then CREATE VIEW mart_customer_revenue AS SELECT customer_id, SUM(total) AS revenue FROM stg_orders GROUP BY customer_id;", xp:40, tables:["orders","customers"],
        exercises:[
          { id:"23.2.e1", prompt:"Add a second mart on the same staging layer: mart_monthly_revenue with each month (strftime '%Y-%m') and its revenue from stg_orders. SELECT from it.",
            validate:{ minRows:20, colCount:2 },
            _ref:"DROP VIEW IF EXISTS stg_orders; CREATE VIEW stg_orders AS SELECT id, customer_id, order_date, total FROM orders WHERE status = 'completed'; DROP VIEW IF EXISTS mart_monthly_revenue; CREATE VIEW mart_monthly_revenue AS SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM stg_orders GROUP BY month; SELECT * FROM mart_monthly_revenue;",
            hint:"CREATE VIEW mart_monthly_revenue AS SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM stg_orders GROUP BY month;", xp:10 }
        ] },

      { id:"23.3", title:"Materializing with CTAS", concept:"Views vs Tables",
        theory:`<p>A view recomputes every time you query it. When the underlying query is expensive and the data changes rarely, <em>materialize</em> it: <code>CREATE TABLE name AS SELECT ...</code> stores the results physically.</p><p>The tradeoff every warehouse team manages: views are always fresh but recompute; tables are fast but go stale and need refreshing. dbt calls this the materialization strategy.</p>`,
        chips:[{t:"CREATE TABLE AS",c:"chip-blue"},{t:"fresh vs fast",c:"chip-amber"}],
        task:"Materialize a table monthly_revenue from completed orders: each month ('%Y-%m') with revenue and order count. Then SELECT * from it ordered by month.",
        starter:"DROP TABLE IF EXISTS monthly_revenue;\n-- CREATE TABLE monthly_revenue AS SELECT ... ;\n-- SELECT * FROM monthly_revenue ORDER BY month;\n",
        solution:["create table monthly_revenue as"],
        hint:"CREATE TABLE monthly_revenue AS SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status = 'completed' GROUP BY month;", xp:35, tables:["orders"],
        exercises:[
          { id:"23.3.e1", prompt:"Materialize dept_summary: each department name with headcount and average salary (join employees to departments on department = dept_name). SELECT from it.",
            validate:{ rowCount:4, colCount:3 },
            _ref:"DROP TABLE IF EXISTS dept_summary; CREATE TABLE dept_summary AS SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary FROM employees GROUP BY department; SELECT * FROM dept_summary;",
            hint:"CREATE TABLE dept_summary AS SELECT department, COUNT(*) AS headcount, AVG(salary) AS avg_salary FROM employees GROUP BY department;", xp:10 }
        ] }
    ]
  },
  {
    day: 24, title: "Data Modeling — Star Schemas", lessons: [
      { id:"24.1", title:"Facts & Dimensions", concept:"Star Schema",
        theory:`<p>Warehouses organize data as a <strong>star schema</strong>: a central <strong>fact table</strong> (events/measurements — orders, clicks, payments) surrounded by <strong>dimension tables</strong> (context — who, what, where, when).</p><p>Facts hold numbers you aggregate; dimensions hold attributes you filter and group by. Analysts join facts to dimensions — that's the "star". Your first modeling job: build the dimensions.</p>`,
        chips:[{t:"fact table",c:"chip-amber"},{t:"dimension table",c:"chip-cyan"},{t:"star schema",c:"chip-purple"}],
        task:"Build dim_customer: a dimension table with customer id (call it customer_key), name, tier, and country from customers. SELECT * from it.",
        starter:"DROP TABLE IF EXISTS dim_customer;\n-- CREATE TABLE dim_customer AS SELECT ... ;\n-- SELECT * FROM dim_customer;\n",
        solution:["create table dim_customer"],
        hint:"CREATE TABLE dim_customer AS SELECT id AS customer_key, name, tier, country FROM customers;", xp:35, tables:["customers"],
        exercises:[
          { id:"24.1.e1", prompt:"Build dim_product with product_key (from id), name, category and price. SELECT from it.",
            validate:{ rowCount:10, hasCols:["product_key","category"] },
            _ref:"DROP TABLE IF EXISTS dim_product; CREATE TABLE dim_product AS SELECT id AS product_key, name, category, price FROM products; SELECT * FROM dim_product;",
            hint:"CREATE TABLE dim_product AS SELECT id AS product_key, name, category, price FROM products;", xp:10 },
          { id:"24.1.e2", prompt:"Build dim_date from orders: the distinct order dates with year and month columns (strftime '%Y' and '%m'). SELECT from it.",
            validate:{ rowCount:30, colCount:3 },
            _ref:"DROP TABLE IF EXISTS dim_date; CREATE TABLE dim_date AS SELECT DISTINCT order_date, strftime('%Y', order_date) AS year, strftime('%m', order_date) AS month FROM orders; SELECT * FROM dim_date;",
            hint:"SELECT DISTINCT order_date, strftime('%Y', order_date) AS year, strftime('%m', order_date) AS month FROM orders", xp:10 }
        ] },

      { id:"24.2", title:"Building the Fact Table", concept:"Grain",
        theory:`<p>Every fact table has a <strong>grain</strong> — what one row means. Declare it before writing any SQL: "one row per order" or "one row per order line". Get the grain wrong and every metric double-counts.</p><p>Fact tables carry: keys pointing at dimensions (customer_key, product_key), the event date, and the measures (total, quantity).</p>`,
        chips:[{t:"grain",c:"chip-red"},{t:"foreign keys",c:"chip-cyan"},{t:"measures",c:"chip-amber"}],
        task:"Build fact_orders at the grain of one row per order: order id, customer_id AS customer_key, employee_id, order_date, status and total. SELECT from it — exactly 30 rows.",
        starter:"DROP TABLE IF EXISTS fact_orders;\n-- Grain: one row per order\n-- CREATE TABLE fact_orders AS SELECT ... ;\n-- SELECT * FROM fact_orders;\n",
        solution:["create table fact_orders"],
        hint:"CREATE TABLE fact_orders AS SELECT id, customer_id AS customer_key, employee_id, order_date, status, total FROM orders;", xp:35, tables:["orders"],
        exercises:[
          { id:"24.2.e1", prompt:"Build fact_order_items at the grain of one row per order line: order_id, product_id AS product_key, quantity, unit_price, and a line_total column (quantity * unit_price). SELECT from it.",
            validate:{ rowCount:36, hasCol:"line_total" },
            _ref:"DROP TABLE IF EXISTS fact_order_items; CREATE TABLE fact_order_items AS SELECT order_id, product_id AS product_key, quantity, unit_price, quantity * unit_price AS line_total FROM order_items; SELECT * FROM fact_order_items;",
            hint:"CREATE TABLE fact_order_items AS SELECT order_id, product_id AS product_key, quantity, unit_price, quantity * unit_price AS line_total FROM order_items;", xp:10 }
        ] },

      { id:"24.3", title:"Querying the Star", concept:"Fact ⋈ Dimensions",
        theory:`<p>With the star in place, analytics becomes mechanical: <code>FROM fact JOIN dim ... GROUP BY dim attribute, SUM(measure)</code>. Revenue by tier, by country, by category — same shape every time.</p><p>This is why modeling matters: a good star makes hundreds of future questions one JOIN away.</p>`,
        chips:[{t:"fact JOIN dim",c:"chip-blue"},{t:"GROUP BY attribute",c:"chip-green"},{t:"SUM(measure)",c:"chip-amber"}],
        task:"Rebuild dim_customer and fact_orders (from the previous lessons), then answer: completed revenue by customer tier. Join the fact to the dimension — 3 rows.",
        starter:"DROP TABLE IF EXISTS dim_customer;\nCREATE TABLE dim_customer AS SELECT id AS customer_key, name, tier, country FROM customers;\nDROP TABLE IF EXISTS fact_orders;\nCREATE TABLE fact_orders AS SELECT id, customer_id AS customer_key, employee_id, order_date, status, total FROM orders;\n\n-- Now: revenue by tier for completed orders\n",
        solution:["join dim_customer"],
        hint:"SELECT d.tier, SUM(f.total) FROM fact_orders f JOIN dim_customer d ON f.customer_key = d.customer_key WHERE f.status = 'completed' GROUP BY d.tier;", xp:40, tables:["orders","customers"],
        exercises:[
          { id:"24.3.e1", prompt:"Same star: completed revenue by country, highest first.",
            validate:{ minRows:5, colCount:2 },
            _ref:"DROP TABLE IF EXISTS dim_customer; CREATE TABLE dim_customer AS SELECT id AS customer_key, name, tier, country FROM customers; DROP TABLE IF EXISTS fact_orders; CREATE TABLE fact_orders AS SELECT id, customer_id AS customer_key, employee_id, order_date, status, total FROM orders; SELECT d.country, SUM(f.total) AS revenue FROM fact_orders f JOIN dim_customer d ON f.customer_key = d.customer_key WHERE f.status = 'completed' GROUP BY d.country ORDER BY revenue DESC;",
            hint:"GROUP BY d.country ORDER BY SUM(f.total) DESC", xp:12 }
        ] }
    ]
  },
  {
    day: 25, title: "Performance & Indexes", lessons: [
      { id:"25.1", title:"Reading Query Plans", concept:"EXPLAIN QUERY PLAN",
        theory:`<p>Before optimizing anything, look at what the database actually does: prefix any query with <code>EXPLAIN QUERY PLAN</code>.</p><p>Two words matter in the output: <strong>SCAN</strong> means reading the whole table (slow on big data); <strong>SEARCH</strong> means jumping straight to matching rows using an index (fast). Every performance conversation in a data team starts with the plan.</p>`,
        chips:[{t:"EXPLAIN QUERY PLAN",c:"chip-blue"},{t:"SCAN = slow",c:"chip-red"},{t:"SEARCH = fast",c:"chip-green"}],
        task:"Show the query plan for finding all orders of customer 5. You'll see a SCAN — there's no index yet.",
        starter:"EXPLAIN QUERY PLAN\nSELECT * FROM orders WHERE customer_id = 5;",
        solution:["explain query plan"],
        hint:"Just prefix the SELECT with EXPLAIN QUERY PLAN — the detail column tells you SCAN or SEARCH", xp:25, tables:["orders"],
        exercises:[
          { id:"25.1.e1", prompt:"Show the query plan for a join: orders joined to customers on customer_id. How many steps does it take?",
            validate:{ minRows:2, hasCol:"detail" },
            _ref:"EXPLAIN QUERY PLAN SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;",
            hint:"EXPLAIN QUERY PLAN SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;", xp:8 }
        ] },

      { id:"25.2", title:"CREATE INDEX", concept:"Indexes",
        theory:`<p>An index is a sorted lookup structure on one or more columns: <code>CREATE INDEX idx_name ON table(column)</code>. Queries filtering or joining on that column switch from SCAN to SEARCH.</p><p>Indexes aren't free — they slow down writes and take space. The engineering judgment: index the columns you filter and join on constantly; skip the rest.</p>`,
        chips:[{t:"CREATE INDEX",c:"chip-blue"},{t:"SEARCH ... USING INDEX",c:"chip-green"},{t:"write cost",c:"chip-amber"}],
        task:"Create an index idx_orders_customer on orders(customer_id), then run EXPLAIN QUERY PLAN on the customer-5 query again — it now says SEARCH ... USING INDEX.",
        starter:"-- 1. Create the index\n-- 2. EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 5;\n",
        solution:["create index"],
        hint:"CREATE INDEX idx_orders_customer ON orders(customer_id); then re-run the EXPLAIN QUERY PLAN", xp:35, tables:["orders"],
        exercises:[
          { id:"25.2.e1", prompt:"Create an index on employees(department), then show the plan for SELECT * FROM employees WHERE department = 'Finance' — verify it uses the index.",
            validate:{ minRows:1, hasCol:"detail" },
            _ref:"CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department); EXPLAIN QUERY PLAN SELECT * FROM employees WHERE department = 'Finance';",
            hint:"CREATE INDEX idx_emp_dept ON employees(department);", xp:10 }
        ] },

      { id:"25.3", title:"Sargable Predicates", concept:"Index-Friendly SQL",
        theory:`<p>An index only helps if the WHERE clause lets the database use it. Wrapping the column in a function — <code>WHERE strftime('%Y', order_date) = '2024'</code> — forces a full scan, because the database can't look up a transformed value.</p><p>The fix: put functions on the <em>constant</em>, not the column. Rewrite as a range: <code>WHERE order_date &gt;= '2024-01-01' AND order_date &lt; '2025-01-01'</code>. This is called a <strong>sargable</strong> (Search-ARGument-able) predicate — a top interview topic.</p>`,
        chips:[{t:"sargable",c:"chip-green"},{t:"no functions on columns",c:"chip-red"},{t:"range rewrite",c:"chip-cyan"}],
        task:"Rewrite the non-sargable query below as a date range on order_date, returning all 2024 orders — same 8 rows, but index-friendly.",
        starter:"-- Non-sargable: the function hides order_date from any index\nSELECT * FROM orders\nWHERE strftime('%Y', order_date) = '2024';\n\n-- Rewrite it as a range on the raw column\n",
        solution:["order_date >= '2024-01-01'"],
        hint:"WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'", xp:35, tables:["orders"],
        exercises:[
          { id:"25.3.e1", prompt:"Rewrite sargably: find employees hired in 2020 or later without using strftime — 7 rows.",
            validate:{ rowCount:7 },
            _ref:"SELECT * FROM employees WHERE hire_date >= '2020-01-01';",
            hint:"WHERE hire_date >= '2020-01-01'", xp:10 },
          { id:"25.3.e2", prompt:"Rewrite sargably: all orders from March 2023 (there is exactly 1). Use a range, not strftime.",
            validate:{ rowCount:1 },
            _ref:"SELECT * FROM orders WHERE order_date >= '2023-03-01' AND order_date < '2023-04-01';",
            hint:"WHERE order_date >= '2023-03-01' AND order_date < '2023-04-01'", xp:10 }
        ] }
    ]
  },
  {
    day: 26, title: "ELT & Incremental Loads", lessons: [
      { id:"26.1", title:"High-Watermark Loads", concept:"Incremental Loading",
        theory:`<p>Reloading a whole table every night stops scaling fast. Production pipelines load <em>incrementally</em>: remember the newest timestamp already loaded (the <strong>high watermark</strong>), and pull only rows newer than it.</p><p>The pattern: <code>INSERT INTO target SELECT ... FROM source WHERE ts &gt; (SELECT MAX(ts) FROM target)</code>. This exact idea powers dbt incremental models and every CDC pipeline.</p>`,
        chips:[{t:"high watermark",c:"chip-amber"},{t:"MAX(loaded_ts)",c:"chip-cyan"},{t:"incremental",c:"chip-green"}],
        task:"Simulate it: create orders_dw with orders up to 2023-12-31 (the 'already loaded' data). Then incrementally INSERT everything newer than the watermark using MAX(order_date). SELECT COUNT(*) — all 30 rows.",
        starter:"-- Initial load: everything up to the end of 2023\nDROP TABLE IF EXISTS orders_dw;\nCREATE TABLE orders_dw AS\nSELECT * FROM orders WHERE order_date <= '2023-12-31';\n\n-- Incremental load: insert only rows newer than the watermark\n-- INSERT INTO orders_dw SELECT * FROM orders WHERE order_date > (...);\n-- SELECT COUNT(*) FROM orders_dw;\n",
        solution:["select max(order_date) from orders_dw"],
        hint:"INSERT INTO orders_dw SELECT * FROM orders WHERE order_date > (SELECT MAX(order_date) FROM orders_dw); then SELECT COUNT(*) FROM orders_dw;", xp:40, tables:["orders"],
        exercises:[
          { id:"26.1.e1", prompt:"Run only the initial load (orders up to 2023-12-31) and count the rows — how many were in the first batch?",
            validate:{ rowCount:1, hasValue:22 },
            _ref:"DROP TABLE IF EXISTS orders_dw; CREATE TABLE orders_dw AS SELECT * FROM orders WHERE order_date <= '2023-12-31'; SELECT COUNT(*) FROM orders_dw;",
            hint:"CREATE TABLE orders_dw AS SELECT * FROM orders WHERE order_date <= '2023-12-31'; SELECT COUNT(*) FROM orders_dw;", xp:10 }
        ] },

      { id:"26.2", title:"Idempotent Loads", concept:"INSERT OR IGNORE",
        theory:`<p>Pipelines crash and rerun. If a rerun inserts the same rows twice, your revenue doubles overnight — the classic data incident. Loads must be <strong>idempotent</strong>: running twice gives the same result as once.</p><p>Two tools: a PRIMARY KEY on the target plus <code>INSERT OR IGNORE</code> (skip rows that already exist), or the upsert from Day 22 (<code>ON CONFLICT DO UPDATE</code>) when late data can change.</p>`,
        chips:[{t:"idempotent",c:"chip-green"},{t:"INSERT OR IGNORE",c:"chip-blue"},{t:"rerun-safe",c:"chip-purple"}],
        task:"Create orders_dw with id INTEGER PRIMARY KEY plus total REAL, load all orders with INSERT OR IGNORE — twice. SELECT COUNT(*) — still 30, not 60.",
        starter:"DROP TABLE IF EXISTS orders_dw;\nCREATE TABLE orders_dw (id INTEGER PRIMARY KEY, total REAL);\n\n-- Load twice with INSERT OR IGNORE, then count\n",
        solution:["insert or ignore"],
        hint:"INSERT OR IGNORE INTO orders_dw SELECT id, total FROM orders; — run that line twice, then SELECT COUNT(*)", xp:40, tables:["orders"],
        exercises:[
          { id:"26.2.e1", prompt:"Prove idempotency with customers: PRIMARY-KEYed table customers_dw (id, name), double-load with INSERT OR IGNORE, count — 15.",
            validate:{ rowCount:1, hasValue:15 },
            _ref:"DROP TABLE IF EXISTS customers_dw; CREATE TABLE customers_dw (id INTEGER PRIMARY KEY, name TEXT); INSERT OR IGNORE INTO customers_dw SELECT id, name FROM customers; INSERT OR IGNORE INTO customers_dw SELECT id, name FROM customers; SELECT COUNT(*) FROM customers_dw;",
            hint:"Same pattern: CREATE with PRIMARY KEY, INSERT OR IGNORE twice, COUNT", xp:10 }
        ] },

      { id:"26.3", title:"Slowly Changing Dimensions (SCD2)", concept:"History Tracking",
        theory:`<p>When a customer upgrades from Basic to Pro, do you overwrite the tier (losing history) or keep both? <strong>SCD Type 2</strong> keeps both: each version is a row with <code>valid_from</code>, <code>valid_to</code>, and <code>is_current</code> flags.</p><p>On a change: UPDATE the old row (set valid_to and is_current = 0), INSERT the new version. Historical reports join on the date range; current reports filter <code>is_current = 1</code>.</p>`,
        chips:[{t:"SCD Type 2",c:"chip-purple"},{t:"valid_from / valid_to",c:"chip-cyan"},{t:"is_current",c:"chip-green"}],
        task:"Build dim_customer_scd from customers with tier, valid_from = signup_date, valid_to = NULL, is_current = 1. Then record customer 2 upgrading to 'Pro' on 2024-06-01: close the old row, insert the new one. SELECT customer 2's rows — 2 versions.",
        starter:"DROP TABLE IF EXISTS dim_customer_scd;\nCREATE TABLE dim_customer_scd AS\nSELECT id AS customer_key, name, tier,\n       signup_date AS valid_from,\n       NULL AS valid_to,\n       1 AS is_current\nFROM customers;\n\n-- 1. UPDATE the old row for customer 2 (valid_to = '2024-06-01', is_current = 0)\n-- 2. INSERT the new 'Pro' version (valid_from = '2024-06-01', is_current = 1)\n-- 3. SELECT * FROM dim_customer_scd WHERE customer_key = 2;\n",
        solution:["is_current = 0"],
        hint:"UPDATE dim_customer_scd SET valid_to = '2024-06-01', is_current = 0 WHERE customer_key = 2; INSERT INTO dim_customer_scd VALUES (2, 'Bob Smith', 'Pro', '2024-06-01', NULL, 1);", xp:50, tables:["customers"],
        exercises:[
          { id:"26.3.e1", prompt:"After the customer-2 upgrade, query only the CURRENT version of every customer — still 15 rows, and customer 2 shows 'Pro'.",
            validate:{ rowCount:15, hasValue:"Pro" },
            _ref:"DROP TABLE IF EXISTS dim_customer_scd; CREATE TABLE dim_customer_scd AS SELECT id AS customer_key, name, tier, signup_date AS valid_from, NULL AS valid_to, 1 AS is_current FROM customers; UPDATE dim_customer_scd SET valid_to = '2024-06-01', is_current = 0 WHERE customer_key = 2; INSERT INTO dim_customer_scd VALUES (2, 'Bob Smith', 'Pro', '2024-06-01', NULL, 1); SELECT * FROM dim_customer_scd WHERE is_current = 1;",
            hint:"WHERE is_current = 1", xp:12 }
        ] }
    ]
  },
  {
    day: 27, title: "Data Quality Testing", lessons: [
      { id:"27.1", title:"Uniqueness & Not-Null Tests", concept:"dbt-style Tests",
        theory:`<p>Data teams test data like developers test code. A data test is a query that counts <em>bad</em> rows — <strong>0 means pass</strong>. dbt's built-in tests (unique, not_null) are exactly this.</p><p>Uniqueness test: group by the key, count how many values appear more than once. Not-null test: count rows where the column IS NULL.</p>`,
        chips:[{t:"0 = pass",c:"chip-green"},{t:"HAVING COUNT(*) > 1",c:"chip-amber"},{t:"IS NULL check",c:"chip-red"}],
        task:"Test that employees.id is unique: count how many id values appear more than once. The result should be one row with 0 — the test passes.",
        starter:"-- A uniqueness test: how many ids are duplicated?\nSELECT COUNT(*) AS failures FROM (\n  SELECT id FROM employees\n  GROUP BY id\n  HAVING COUNT(*) > 1\n);",
        solution:["having count(*) > 1"],
        hint:"Wrap a GROUP BY id HAVING COUNT(*) > 1 in a subquery and COUNT the offenders", xp:35, tables:["employees"],
        exercises:[
          { id:"27.1.e1", prompt:"Not-null test on customers.email: return the offending rows themselves (name and email). This test FAILS — 3 rows come back.",
            validate:{ rowCount:3, hasCol:"name" },
            _ref:"SELECT name, email FROM customers WHERE email IS NULL;",
            hint:"SELECT name, email FROM customers WHERE email IS NULL;", xp:10 },
          { id:"27.1.e2", prompt:"Uniqueness test on customers.email (ignore NULLs): count emails used more than once — expect 0.",
            validate:{ rowCount:1, hasValue:0 },
            _ref:"SELECT COUNT(*) AS failures FROM (SELECT email FROM customers WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1);",
            hint:"Filter email IS NOT NULL before grouping", xp:10 }
        ] },

      { id:"27.2", title:"Referential Integrity Tests", concept:"Orphan Detection",
        theory:`<p>A foreign key that points nowhere is an <strong>orphan</strong> — order_items referencing a deleted product, orders referencing a missing customer. Warehouses rarely enforce foreign keys, so you test for orphans instead.</p><p>The anti-join pattern from Day 11 is the test: LEFT JOIN child to parent, keep rows where the parent side IS NULL.</p>`,
        chips:[{t:"orphans",c:"chip-red"},{t:"LEFT JOIN ... IS NULL",c:"chip-blue"},{t:"relationship test",c:"chip-purple"}],
        task:"Test that every order belongs to a real customer: count orders whose customer_id has no match in customers. Expect one row with 0 — the relationship is healthy.",
        starter:"-- Anti-join: orders with no matching customer\nSELECT COUNT(*) AS orphans\nFROM orders o\nLEFT JOIN customers c ON o.customer_id = c.id\nWHERE c.id IS NULL;",
        solution:["left join","is null"],
        hint:"LEFT JOIN orders to customers, count rows where customers.id IS NULL", xp:35, tables:["orders","customers"],
        exercises:[
          { id:"27.2.e1", prompt:"Test order_items → products: count line items referencing a product that doesn't exist. Expect 0.",
            validate:{ rowCount:1, hasValue:0 },
            _ref:"SELECT COUNT(*) AS orphans FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE p.id IS NULL;",
            hint:"Same anti-join with order_items and products", xp:10 },
          { id:"27.2.e2", prompt:"Reverse direction: find customers who have never placed an order (name and country) — 1 row.",
            validate:{ rowCount:1, hasCols:["name","country"] },
            _ref:"SELECT c.name, c.country FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;",
            hint:"LEFT JOIN customers to orders, keep WHERE o.id IS NULL", xp:10 }
        ] },

      { id:"27.3", title:"Reconciliation & Freshness", concept:"Cross-Source Checks",
        theory:`<p>The most valuable quality check compares two sources that should agree. Here: <code>orders.total</code> should equal the sum of that order's line items. When they disagree, someone's report is wrong.</p><p>The pattern: aggregate the detail table, join to the summary, keep rows where the numbers differ. Plus a <strong>freshness</strong> check — MAX(date) tells you if the pipeline stopped loading.</p>`,
        chips:[{t:"reconciliation",c:"chip-amber"},{t:"HAVING mismatch",c:"chip-red"},{t:"freshness",c:"chip-cyan"}],
        task:"Reconcile orders against order_items: find every order where total doesn't match SUM(quantity * unit_price) (difference above 0.01). This data has 4 real mismatches — find them.",
        starter:"-- Compare each order's total to the sum of its line items\nSELECT o.id, o.total,\n       ROUND(SUM(oi.quantity * oi.unit_price), 2) AS calculated\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nGROUP BY o.id, o.total\n-- HAVING the difference is bigger than 0.01\n",
        solution:["having abs(","having o.total"],
        hint:"HAVING ABS(o.total - SUM(oi.quantity * oi.unit_price)) > 0.01", xp:50, tables:["orders","order_items"],
        exercises:[
          { id:"27.3.e1", prompt:"Freshness check: return the most recent order_date in orders — a monitoring query you'd run every morning.",
            validate:{ rowCount:1, hasValue:"2024-08-10" },
            _ref:"SELECT MAX(order_date) AS freshest FROM orders;",
            hint:"SELECT MAX(order_date) FROM orders;", xp:8 },
          { id:"27.3.e2", prompt:"Volume check: orders per status — completed, pending, cancelled with their counts (3 rows). Sudden shifts here signal upstream breakage.",
            validate:{ rowCount:3, colCount:2 },
            _ref:"SELECT status, COUNT(*) AS n FROM orders GROUP BY status;",
            hint:"GROUP BY status", xp:8 }
        ] }
    ]
  },
  {
    day: 28, title: "The Interview Gauntlet", lessons: [
      { id:"28.1", title:"Top-N per Group", concept:"Interview Classic #1",
        theory:`<p>The single most-asked SQL interview question: "highest paid employee in each department" — and its cousins (top 3 products per category, latest order per customer).</p><p>The pattern is always the same: <code>ROW_NUMBER() OVER (PARTITION BY group ORDER BY metric DESC)</code> in a CTE, then filter <code>WHERE rn = 1</code> (or rn &lt;= 3). Know it cold.</p>`,
        chips:[{t:"ROW_NUMBER()",c:"chip-purple"},{t:"PARTITION BY",c:"chip-blue"},{t:"WHERE rn = 1",c:"chip-green"}],
        task:"Find the highest-paid employee in each department: name, department, salary — exactly 4 rows.",
        starter:"-- WITH ranked AS (\n--   SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM employees\n-- )\n-- SELECT ... WHERE rn = 1;\n",
        solution:["row_number() over (partition by department"],
        hint:"WITH ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) SELECT first_name, department, salary FROM ranked WHERE rn = 1;", xp:45, tables:["employees"],
        exercises:[
          { id:"28.1.e1", prompt:"Latest order per customer: customer_id and their most recent order_date, one row per customer who ordered — 14 rows.",
            validate:{ rowCount:14 },
            _ref:"WITH ranked AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn FROM orders) SELECT customer_id, order_date FROM ranked WHERE rn = 1;",
            hint:"PARTITION BY customer_id ORDER BY order_date DESC, keep rn = 1", xp:12 },
          { id:"28.1.e2", prompt:"Top product per category by price: category, name, price — 3 rows.",
            validate:{ rowCount:3, hasCols:["category","name"] },
            _ref:"WITH ranked AS (SELECT category, name, price, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn FROM products) SELECT category, name, price FROM ranked WHERE rn = 1;",
            hint:"PARTITION BY category ORDER BY price DESC", xp:12 }
        ] },

      { id:"28.2", title:"Nth-Highest Value", concept:"Interview Classic #2",
        theory:`<p>"Find the second-highest salary" — asked so often it's a meme, and there are three accepted answers: <code>ORDER BY ... LIMIT 1 OFFSET 1</code> (with DISTINCT), a subquery with <code>MAX</code> excluding the max, or <code>DENSE_RANK</code>.</p><p>Interviewers push on edge cases: duplicates (use DISTINCT or DENSE_RANK) and "what if there's no second value?" (returns nothing — mention it and you stand out).</p>`,
        chips:[{t:"LIMIT 1 OFFSET 1",c:"chip-amber"},{t:"DENSE_RANK",c:"chip-purple"},{t:"edge cases",c:"chip-red"}],
        task:"Find the second-highest distinct salary in employees — one row, 130000. Any of the three approaches counts.",
        starter:"-- Approach 1: SELECT DISTINCT salary ... ORDER BY ... LIMIT 1 OFFSET 1\n-- Approach 2: MAX(salary) below the MAX\n-- Approach 3: DENSE_RANK\n",
        solution:["offset 1","dense_rank","< (select max(salary)"],
        hint:"SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;", xp:45, tables:["employees"],
        exercises:[
          { id:"28.2.e1", prompt:"Third-highest distinct salary — one row, 120000.",
            validate:{ rowCount:1, hasValue:120000 },
            _ref:"SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;",
            hint:"OFFSET 2 skips the top two", xp:10 },
          { id:"28.2.e2", prompt:"Second-most-expensive product: name and price, one row.",
            validate:{ rowCount:1, hasCols:["name","price"] },
            _ref:"SELECT name, price FROM products ORDER BY price DESC LIMIT 1 OFFSET 1;",
            hint:"ORDER BY price DESC LIMIT 1 OFFSET 1", xp:10 }
        ] },

      { id:"28.3", title:"Above the Group Average", concept:"Interview Classic #3",
        theory:`<p>"Which employees earn more than their department's average?" tests whether you can compare a row against an aggregate of its own group. Two clean answers:</p><p>A <strong>correlated subquery</strong> — <code>WHERE salary &gt; (SELECT AVG(salary) FROM employees e2 WHERE e2.department = e.department)</code> — or a window: <code>AVG(salary) OVER (PARTITION BY department)</code> in a CTE, then filter.</p>`,
        chips:[{t:"correlated subquery",c:"chip-blue"},{t:"AVG() OVER",c:"chip-purple"},{t:"row vs group",c:"chip-green"}],
        task:"Find every employee earning strictly more than their department's average salary: name, department, salary.",
        starter:"-- Either the correlated subquery or the window approach works\n",
        solution:["avg(salary) over (partition by department","where e2.department = e.department","where department = e.department"],
        hint:"WITH x AS (SELECT *, AVG(salary) OVER (PARTITION BY department) AS dept_avg FROM employees) SELECT first_name, department, salary FROM x WHERE salary > dept_avg;", xp:45, tables:["employees"],
        exercises:[
          { id:"28.3.e1", prompt:"Flip it: employees earning at or below their department average — the complement of your last answer (15 minus the above-average count).",
            validate:{ minRows:5, hasCol:"first_name" },
            _ref:"WITH x AS (SELECT *, AVG(salary) OVER (PARTITION BY department) AS dept_avg FROM employees) SELECT first_name, department, salary FROM x WHERE salary <= dept_avg;",
            hint:"Change > to <=", xp:12 },
          { id:"28.3.e2", prompt:"Products priced above their category's average price: name, category, price.",
            validate:{ minRows:2, hasCols:["name","category"] },
            _ref:"WITH x AS (SELECT *, AVG(price) OVER (PARTITION BY category) AS cat_avg FROM products) SELECT name, category, price FROM x WHERE price > cat_avg;",
            hint:"Same pattern with products and category", xp:12 }
        ] },

      { id:"28.4", title:"Final Boss — The 45-Minute Screen", concept:"Everything At Once",
        theory:`<p>Real SQL screens end with one big question that layers everything: filtering, joins, aggregation, windows, and a CTE pipeline. Take it step by step exactly as you would live: write the innermost CTE, run it, add the next layer.</p><p>You've covered every technique this question needs. This is the certification moment — after this, you're ready to interview.</p>`,
        chips:[{t:"CTE pipeline",c:"chip-blue"},{t:"window functions",c:"chip-purple"},{t:"the whole toolkit",c:"chip-amber"}],
        task:"For each month of 2023: revenue from completed orders, number of orders, and a running (cumulative) revenue total across the year — 11 rows (one month has no completed order), in month order.",
        starter:"-- Step 1: CTE with monthly revenue + order count for 2023 completed orders\n-- Step 2: add SUM(revenue) OVER (ORDER BY month) for the running total\n",
        solution:["sum(","over (order by"],
        hint:"WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' GROUP BY month) SELECT month, revenue, orders, SUM(revenue) OVER (ORDER BY month) AS ytd FROM monthly ORDER BY month;", xp:100, tables:["orders"],
        exercises:[
          { id:"28.4.e1", prompt:"Extend the final boss: add each month's % of total 2023 revenue as a fourth metric.",
            validate:{ minRows:10, colCount:5 },
            _ref:"WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' GROUP BY month) SELECT month, revenue, orders, SUM(revenue) OVER (ORDER BY month) AS ytd, ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS pct_of_year FROM monthly ORDER BY month;",
            hint:"Divide by SUM(revenue) OVER () — the whole-year total", xp:20 }
        ] }
    ]
  }
];

const schemas = {
  employees: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"first_name",type:"TEXT"},{name:"department",type:"TEXT"},{name:"salary",type:"INTEGER"},{name:"hire_date",type:"TEXT"},{name:"manager_id",type:"INTEGER"}],
    create:`CREATE TABLE employees (id INTEGER PRIMARY KEY, first_name TEXT, department TEXT, salary INTEGER, hire_date TEXT, manager_id INTEGER);`,
    insert:[
      `INSERT INTO employees VALUES (1,'Alice','Engineering',120000,'2019-03-15',5);`,
      `INSERT INTO employees VALUES (2,'Bob','Marketing',75000,'2020-07-01',15);`,
      `INSERT INTO employees VALUES (3,'Carol','Engineering',98000,'2018-11-20',5);`,
      `INSERT INTO employees VALUES (4,'David','HR',62000,'2021-02-10',14);`,
      `INSERT INTO employees VALUES (5,'Eve','Engineering',145000,'2017-05-30',NULL);`,
      `INSERT INTO employees VALUES (6,'Frank','Marketing',82000,'2020-01-15',15);`,
      `INSERT INTO employees VALUES (7,'Grace','Finance',95000,'2019-08-22',12);`,
      `INSERT INTO employees VALUES (8,'Hank','HR',58000,'2022-04-05',14);`,
      `INSERT INTO employees VALUES (9,'Iris','Finance',110000,'2018-06-18',12);`,
      `INSERT INTO employees VALUES (10,'Jack','Engineering',88000,'2021-09-12',5);`,
      `INSERT INTO employees VALUES (11,'Kate','Marketing',67000,'2022-11-30',15);`,
      `INSERT INTO employees VALUES (12,'Leo','Finance',130000,'2016-12-01',NULL);`,
      `INSERT INTO employees VALUES (13,'Maya','Engineering',105000,'2020-03-20',5);`,
      `INSERT INTO employees VALUES (14,'Nate','HR',71000,'2019-10-08',NULL);`,
      `INSERT INTO employees VALUES (15,'Olivia','Marketing',89000,'2018-04-25',NULL);`,
    ]
  },
  departments: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"dept_name",type:"TEXT"},{name:"location",type:"TEXT"},{name:"budget",type:"INTEGER"}],
    create:`CREATE TABLE departments (id INTEGER PRIMARY KEY, dept_name TEXT, location TEXT, budget INTEGER);`,
    insert:[
      `INSERT INTO departments VALUES (1,'Engineering','San Francisco',2000000);`,
      `INSERT INTO departments VALUES (2,'Marketing','New York',800000);`,
      `INSERT INTO departments VALUES (3,'Finance','Chicago',1200000);`,
      `INSERT INTO departments VALUES (4,'HR','Austin',400000);`,
      `INSERT INTO departments VALUES (5,'Legal','Boston',600000);`,
    ]
  },
  customers: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"name",type:"TEXT"},{name:"email",type:"TEXT"},{name:"city",type:"TEXT"},{name:"country",type:"TEXT"},{name:"signup_date",type:"TEXT"},{name:"tier",type:"TEXT"}],
    create:`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT, city TEXT, country TEXT, signup_date TEXT, tier TEXT);`,
    insert:[
      `INSERT INTO customers VALUES (1,'Alice Chen','alice@gmail.com','San Francisco','USA','2022-01-15','Pro');`,
      `INSERT INTO customers VALUES (2,'Bob Smith',NULL,'New York','USA','2022-03-20','Basic');`,
      `INSERT INTO customers VALUES (3,'Carol White','carol@outlook.com',NULL,'UK','2022-02-10','Enterprise');`,
      `INSERT INTO customers VALUES (4,'David Brown','david@gmail.com','Chicago','USA','2022-04-05','Basic');`,
      `INSERT INTO customers VALUES (5,'Eva Martinez','eva@email.com','Madrid','Spain','2022-05-12','Pro');`,
      `INSERT INTO customers VALUES (6,'Frank Lee',NULL,NULL,'Canada','2022-06-18','Basic');`,
      `INSERT INTO customers VALUES (7,'Grace Kim','grace@gmail.com','Seoul','South Korea','2022-07-22','Enterprise');`,
      `INSERT INTO customers VALUES (8,'Henry Davis','henry@outlook.com','London','UK','2022-08-30','Pro');`,
      `INSERT INTO customers VALUES (9,'Iris Johnson','iris@email.com','Toronto','Canada','2022-09-14','Basic');`,
      `INSERT INTO customers VALUES (10,'Jack Wilson','jack@gmail.com','Sydney','Australia','2022-10-05','Pro');`,
      `INSERT INTO customers VALUES (11,'Kate Taylor',NULL,'Berlin','Germany','2023-01-10','Basic');`,
      `INSERT INTO customers VALUES (12,'Leo Garcia','leo@gmail.com','Paris','France','2023-02-15','Enterprise');`,
      `INSERT INTO customers VALUES (13,'Maya Anderson','maya@email.com','Tokyo','Japan','2023-03-20','Pro');`,
      `INSERT INTO customers VALUES (14,'Nate Thomas','nate@outlook.com',NULL,'USA','2023-04-25','Basic');`,
      `INSERT INTO customers VALUES (15,'Olivia Jackson','olivia@gmail.com','Amsterdam','Netherlands','2023-05-30','Enterprise');`,
    ]
  },
  products: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"name",type:"TEXT"},{name:"category",type:"TEXT"},{name:"price",type:"REAL"},{name:"stock",type:"INTEGER"}],
    create:`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER);`,
    insert:[
      `INSERT INTO products VALUES (1,'Pro Analytics Suite','Software',299.00,999);`,
      `INSERT INTO products VALUES (2,'Data Pipeline Tool','Software',499.00,999);`,
      `INSERT INTO products VALUES (3,'SQL Bootcamp License','Software',99.00,999);`,
      `INSERT INTO products VALUES (4,'Server Hardware Kit','Hardware',1299.00,45);`,
      `INSERT INTO products VALUES (5,'Network Switch Pro','Hardware',799.00,30);`,
      `INSERT INTO products VALUES (6,'SSD 2TB','Hardware',199.00,150);`,
      `INSERT INTO products VALUES (7,'Consulting Package','Services',2000.00,999);`,
      `INSERT INTO products VALUES (8,'Support Plan Annual','Services',599.00,999);`,
      `INSERT INTO products VALUES (9,'Training Workshop','Services',399.00,999);`,
      `INSERT INTO products VALUES (10,'Cloud Storage 1TB','Software',149.00,999);`,
    ]
  },
  orders: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"customer_id",type:"INTEGER"},{name:"employee_id",type:"INTEGER"},{name:"order_date",type:"TEXT"},{name:"status",type:"TEXT"},{name:"total",type:"REAL"}],
    create:`CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, employee_id INTEGER, order_date TEXT, status TEXT, total REAL);`,
    insert:[
      `INSERT INTO orders VALUES (1,1,2,'2022-03-15','completed',398.00);`,
      `INSERT INTO orders VALUES (2,2,6,'2022-04-20','completed',99.00);`,
      `INSERT INTO orders VALUES (3,3,2,'2022-05-10','completed',2299.00);`,
      `INSERT INTO orders VALUES (4,4,11,'2022-06-15','cancelled',299.00);`,
      `INSERT INTO orders VALUES (5,5,6,'2022-07-20','completed',499.00);`,
      `INSERT INTO orders VALUES (6,6,2,'2022-08-05','completed',798.00);`,
      `INSERT INTO orders VALUES (7,7,11,'2022-09-12','completed',2599.00);`,
      `INSERT INTO orders VALUES (8,8,6,'2022-10-18','pending',199.00);`,
      `INSERT INTO orders VALUES (9,9,2,'2022-11-22','completed',99.00);`,
      `INSERT INTO orders VALUES (10,10,11,'2022-12-05','completed',1298.00);`,
      `INSERT INTO orders VALUES (11,1,6,'2023-01-10','completed',499.00);`,
      `INSERT INTO orders VALUES (12,3,2,'2023-02-15','completed',2000.00);`,
      `INSERT INTO orders VALUES (13,5,11,'2023-03-20','cancelled',299.00);`,
      `INSERT INTO orders VALUES (14,7,6,'2023-04-25','completed',599.00);`,
      `INSERT INTO orders VALUES (15,2,2,'2023-05-30','completed',1499.00);`,
      `INSERT INTO orders VALUES (16,4,11,'2023-06-10','completed',398.00);`,
      `INSERT INTO orders VALUES (17,6,6,'2023-07-15','completed',99.00);`,
      `INSERT INTO orders VALUES (18,8,2,'2023-08-20','completed',2000.00);`,
      `INSERT INTO orders VALUES (19,10,11,'2023-09-05','completed',499.00);`,
      `INSERT INTO orders VALUES (20,12,6,'2023-10-12','completed',2599.00);`,
      `INSERT INTO orders VALUES (21,1,2,'2023-11-18','completed',299.00);`,
      `INSERT INTO orders VALUES (22,3,11,'2023-12-22','completed',799.00);`,
      `INSERT INTO orders VALUES (23,5,6,'2024-01-08','completed',149.00);`,
      `INSERT INTO orders VALUES (24,7,2,'2024-02-14','completed',398.00);`,
      `INSERT INTO orders VALUES (25,9,11,'2024-03-20','completed',99.00);`,
      `INSERT INTO orders VALUES (26,11,6,'2024-04-10','pending',499.00);`,
      `INSERT INTO orders VALUES (27,13,2,'2024-05-15','completed',2000.00);`,
      `INSERT INTO orders VALUES (28,15,11,'2024-06-20','completed',1298.00);`,
      `INSERT INTO orders VALUES (29,2,6,'2024-07-05','cancelled',299.00);`,
      `INSERT INTO orders VALUES (30,4,2,'2024-08-10','completed',599.00);`,
    ]
  },
  order_items: {
    cols:[{name:"id",type:"INTEGER",pk:true},{name:"order_id",type:"INTEGER"},{name:"product_id",type:"INTEGER"},{name:"quantity",type:"INTEGER"},{name:"unit_price",type:"REAL"}],
    create:`CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL);`,
    insert:[
      `INSERT INTO order_items VALUES (1,1,1,1,299.00);`,
      `INSERT INTO order_items VALUES (2,1,3,1,99.00);`,
      `INSERT INTO order_items VALUES (3,2,3,1,99.00);`,
      `INSERT INTO order_items VALUES (4,3,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (5,3,1,1,299.00);`,
      `INSERT INTO order_items VALUES (6,4,1,1,299.00);`,
      `INSERT INTO order_items VALUES (7,5,2,1,499.00);`,
      `INSERT INTO order_items VALUES (8,6,6,4,199.00);`,
      `INSERT INTO order_items VALUES (9,7,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (10,7,8,1,599.00);`,
      `INSERT INTO order_items VALUES (11,8,6,1,199.00);`,
      `INSERT INTO order_items VALUES (12,9,3,1,99.00);`,
      `INSERT INTO order_items VALUES (13,10,4,1,1299.00);`,
      `INSERT INTO order_items VALUES (14,11,2,1,499.00);`,
      `INSERT INTO order_items VALUES (15,12,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (16,13,1,1,299.00);`,
      `INSERT INTO order_items VALUES (17,14,8,1,599.00);`,
      `INSERT INTO order_items VALUES (18,15,2,3,499.00);`,
      `INSERT INTO order_items VALUES (19,16,1,1,299.00);`,
      `INSERT INTO order_items VALUES (20,16,3,1,99.00);`,
      `INSERT INTO order_items VALUES (21,17,3,1,99.00);`,
      `INSERT INTO order_items VALUES (22,18,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (23,19,2,1,499.00);`,
      `INSERT INTO order_items VALUES (24,20,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (25,20,8,1,599.00);`,
      `INSERT INTO order_items VALUES (26,21,1,1,299.00);`,
      `INSERT INTO order_items VALUES (27,22,5,1,799.00);`,
      `INSERT INTO order_items VALUES (28,23,10,1,149.00);`,
      `INSERT INTO order_items VALUES (29,24,1,1,299.00);`,
      `INSERT INTO order_items VALUES (30,24,3,1,99.00);`,
      `INSERT INTO order_items VALUES (31,25,3,1,99.00);`,
      `INSERT INTO order_items VALUES (32,26,2,1,499.00);`,
      `INSERT INTO order_items VALUES (33,27,7,1,2000.00);`,
      `INSERT INTO order_items VALUES (34,28,4,1,1299.00);`,
      `INSERT INTO order_items VALUES (35,29,1,1,299.00);`,
      `INSERT INTO order_items VALUES (36,30,8,1,599.00);`,
    ]
  }
};
