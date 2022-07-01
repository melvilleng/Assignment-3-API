const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const bcrypt = require("bcrypt");

const app = express();

let datetime = new Date();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    key: "userId",
    secret: "testing",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 24,
    },
  })
);

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "password",
  database: "kaaban",
});

//test connection into database
db.connect((err) => {
  if (err) {
    console.log("Database Connection Failed !!!", err);
  } else {
    console.log("connected to Database");
  }
});

//sign up function
app.post("/signup", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;
  // const usergroup = "Member";

  bcrypt.hash(password, 10).then((hash) => {
    db.query(
      "INSERT INTO accounts (username,password,email) VALUES (?,?,?)",
      [username, hash, email],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          res.send("values inserted");
        }
      }
    );
  });
});

//login function
app.get("/login", (req, res) => {
  console.log(req.session.user);
  if (req.session.user) {
    res.send({ loggedIn: true, user: req.session.user });
  } else {
    res.send({ loggedIn: false });
  }
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.query(
    "SELECT * FROM accounts WHERE username=?",
    [username],
    async (err, results) => {
      try {
        if ((await results[0].status) === "Disable") {
          res.send({ message: "Disable" });
        } else {
          if (err) {
            console.log(err);
          }
          if (results.length > 0) {
            await bcrypt.compare(
              password,
              results[0].password,
              (err, response) => {
                if (response) {
                  req.session.user = results;
                  res.send(results);
                } else {
                  res.send({ message: "Wrong username/password" });
                }
              }
            );
          } else {
            res.send({ message: "User does not exist" });
          }
        }
      } catch {
        res.send({ message: "Wrong username/password" });
      }
    }
  );
});

//list all the user
app.get("/showall", function (req, res) {
  db.query("SELECT * FROM accounts", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(JSON.stringify(result));
    }
  });
});

//get one user
app.post("/showone", function (req, res) {
  const username = req.body.username;
  db.query(
    "SELECT * FROM accounts WHERE username=?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
        console.log(result);
      }
    }
  );
});

// edit the user password
app.post("/update", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;
  if (password) {
    bcrypt.hash(password, 10).then((hash) => {
      db.query(
        "UPDATE accounts SET password=? WHERE username=?",
        [hash, username],
        (err, result) => {
          if (err) {
            console.log(err);
          } else {
            console.log(result);
            res.send("Done");
          }
        }
      );
    });
  }
  if (email) {
    db.query(
      "UPDATE accounts SET email=? WHERE username=?",
      [email, username],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log(result);
          res.send("Done");
        }
      }
    );
  }
});

//disable
app.post("/disable", function (req, res) {
  const username = req.body.username;
  const status = req.body.status;
  db.query(
    "UPDATE accounts SET status=? WHERE username=?",
    [status, username],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("Done");
      }
    }
  );
});

//create user group
app.post("/createusergroup", function (req, res) {
  const usergroup_name = req.body.usergroup_name;
  db.query(
    "INSERT INTO usergroup (usergroup_name) VALUES (?)",
    [usergroup_name],
    (err, results) => {
      if (err) {
        console.log(err);
      } else {
        res.send(results);
      }
    }
  );
});

//list usergroup
app.get("/showusergroup", function (req, res) {
  db.query("SELECT * FROM usergroup", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

//add user to usergroup
app.post("/addusergroup", function (req, res) {
  const usergroup = req.body.usergroup;
  const username = req.body.username;
  db.query(
    "SELECT usergroup FROM accounts WHERE username=?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      if (result[0].usergroup === null) {
        db.query(
          "UPDATE accounts SET usergroup=? WHERE username=?",
          [usergroup, username],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              res.send(result);
            }
          }
        );
      } else if (result[0].usergroup.includes(usergroup) === true) {
        res.send({ dup: "User Group has been in the User Group" });
      } else {
        const newusergroup = result[0].usergroup + "," + usergroup;
        db.query(
          "UPDATE accounts SET usergroup=? WHERE username=?",
          [newusergroup, username],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              res.send(result);
            }
          }
        );
      }
    }
  );
});

//disable group
app.post("/disablegroup", function (req, res) {
  const usergroup = req.body.usergroup_name;
  let status = req.body.usergroup_status;
  if (status === "Enable") {
    status = "Disable";
  } else {
    status = "Enable";
  }
  db.query(
    "UPDATE usergroup SET usergroup_status=? WHERE usergroup_name=?",
    [status, usergroup],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("Done");
      }
    }
  );
});

//remove from group
app.post("/removeusergroup", function (req, res) {
  const usergroup = req.body.usergroup;
  const username = req.body.username;
  db.query(
    "SELECT usergroup FROM accounts WHERE username=?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        if (result[0].usergroup === null) {
          res.send({ nouser: "No User Group to be remove" });
        } else if (result[0].usergroup === usergroup) {
          onlyone_usergroup = null;
          db.query(
            "UPDATE accounts SET usergroup=? WHERE username=?",
            [onlyone_usergroup, username],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                res.send({ message: "User Group has been removed" });
              }
            }
          );
        } else {
          array_usergroup = result[0].usergroup.split(",");
          new_array_usergroup = array_usergroup.filter(
            (group) => group != usergroup
          );
          join_new_array_usergroup = new_array_usergroup.join(",");

          db.query(
            "UPDATE accounts SET usergroup=? WHERE username=?",
            [join_new_array_usergroup, username],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                res.send({ message: "User Group has been removed" });
              }
            }
          );
        }
      }
    }
  );
});

//checkgroup
app.post("/checkgroup", function (req, res) {
  const username = req.body.username;
  db.query(
    "SELECT usergroup FROM accounts WHERE username=?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result[0].usergroup);
      if (result[0].usergroup === null) {
        res.send({ isAdmin: false });
      } else if (result[0].usergroup.includes("Admin")) {
        res.send({ isAdmin: true });
      } else {
        res.send({ isAdmin: false });
      }
    }
  );
});

//permit check
app.post("/checkpermit", function (req, res) {
  const username = req.body.username;
  const appname = req.body.appname;
  db.query(
    "SELECT * FROM application WHERE App_Acronym=?",
    [appname],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result[0].App_permit_toDoList);
        let create = result[0].App_permit_Create;
        let open = result[0].App_permit_Open;
        let toDo = result[0].App_permit_toDoList;
        let doing = result[0].App_permit_Doing;
        let done = result[0].App_permit_Done;
        db.query(
          "SELECT usergroup FROM accounts WHERE username=?",
          [username],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              let listusergroup = result[0].usergroup.split(",");
              console.log(listusergroup.includes(toDo));
              res.send({
                permit_create: listusergroup.includes(create),
                permit_open: listusergroup.includes(open),
                permit_toDo: listusergroup.includes(toDo),
                permit_doing: listusergroup.includes(doing),
                permit_done: listusergroup.includes(done),
                editplanright: listusergroup.includes("Project Manager"),
                placcesscontrol: listusergroup.includes("Project Lead"),
              });
            }
          }
        );
      }
    }
  );
});

//edit task rights
app.post("/edittaskright", function (req, res) {
  const task_state = req.body.task_state;
  const taskid = req.body.taskid;
  const username = req.body.username;
  db.query(
    "SELECT task_state FROM task WHERE Task_id=?",
    [taskid],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        let state = result[0].task_state;
        db.query(
          "SELECT usergroup FROM accounts WHERE username=?",
          [username],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (
                result[0].usergroup === "Project Manager" &&
                state === "Open"
              ) {
                res.send({ PM: true });
                console.log("test");
              } else if (
                result[0].usergroup === "Project Lead" &&
                state === "Done"
              ) {
                res.send({ PL: true });
              }
            }
          }
        );
      }
    }
  );
});

//create application
app.post("/create_application", function (req, res) {
  const app_acronym = req.body.app_acronym;
  const app_rnumber = req.body.app_rnumber;
  const app_description = req.body.app_description;
  const app_start_date = req.body.app_start_date;
  const app_end_date = req.body.app_end_date;
  const app_open = req.body.app_open;
  const app_create = req.body.app_create;
  const app_todo = req.body.app_todo;
  const app_doing = req.body.app_doing;
  const app_done = req.body.app_done;

  db.query(
    "INSERT INTO application (App_Acronym,App_Rnumber,App_Description,App_startDate,App_endDate,App_permit_Create,App_permit_Open,App_permit_toDoList,App_permit_Doing,App_permit_Done) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      app_acronym,
      app_rnumber,
      app_description,
      app_start_date,
      app_end_date,
      app_create,
      app_open,
      app_todo,
      app_doing,
      app_done,
    ],
    (err, results) => {
      if (err) {
        console.log(err);
      } else {
        res.send("application values inserted");
      }
    }
  );
});

//show all application
app.get("/showallapplication", function (req, res) {
  db.query("SELECT * FROM application", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      res.send(result);
    }
  });
});

app.post("/createaccessapplication", function (req, res) {
  const username = req.body.username;
  db.query(
    "SELECT usergroup FROM accounts WHERE username=?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

//show one application
app.get("/showallapplication/:appname", function (req, res) {
  db.query(
    "SELECT * FROM application WHERE App_Acronym=?",
    [req.params.appname],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result[0]);
      }
    }
  );
});

//edit one application
app.post("/edit_application", function (req, res) {
  const app_description = req.body.app_description;
  const app_start_date = req.body.app_start_date;
  const app_end_date = req.body.app_end_date;
  const appname = req.body.appname;
  if (app_description) {
    db.query(
      "UPDATE application SET App_Description=? WHERE App_Acronym=?",
      [app_description, appname],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("update description");
        }
      }
    );
  } else if (app_start_date) {
    db.query(
      "UPDATE application SET App_startDate=? WHERE App_Acronym=?",
      [app_start_date, appname],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("update start date");
        }
      }
    );
  } else if (app_end_date) {
    db.query(
      "UPDATE application SET App_endDate=? WHERE App_Acronym=?",
      [app_end_date, appname],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("update end date");
        }
      }
    );
  }
});

//edit permit
app.post("/edit_permit", function (req, res) {
  const app_open = req.body.app_open;
  const app_create = req.body.app_create;
  const app_todo = req.body.app_todo;
  const app_doing = req.body.app_doing;
  const app_done = req.body.app_done;
  const appname = req.body.appname;
  if (app_open) {
    db.query(
      "UPDATE application SET App_permit_Open=? WHERE App_Acronym=?",
      [app_open, appname],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          console.log("application values updated");
        }
      }
    );
  } else if (app_create) {
    db.query(
      "UPDATE application SET App_permit_Create=? WHERE App_Acronym=?",
      [app_create, appname],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          console.log("application values updated");
        }
      }
    );
  } else if (app_todo) {
    db.query(
      "UPDATE application SET App_permit_toDoList=? WHERE App_Acronym=?",
      [app_todo, appname],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          console.log("application values updated");
        }
      }
    );
  } else if (app_doing) {
    db.query(
      "UPDATE application SET App_permit_Doing=? WHERE App_Acronym=?",
      [app_doing, appname],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          console.log("application values updated");
        }
      }
    );
  } else if (app_done) {
    db.query(
      "UPDATE application SET App_permit_Done=? WHERE App_Acronym=?",
      [app_done, appname],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          console.log("application values updated");
        }
      }
    );
  } else {
    console.log("error");
  }
});

//create plan
app.post("/create_plan", function (req, res) {
  const plan_mvp_name = req.body.plan_mvp_name;
  const plan_start_date = req.body.plan_start_date;
  const plan_end_date = req.body.plan_end_date;
  const plan_app_acronym = req.body.plan_app_Acronym;

  try {
    db.query(
      "INSERT INTO plan (Plan_MVP_name,Plan_startDate,Plan_endDate,Plan_app_Acronym) VALUES (?,?,?,?)",
      [plan_mvp_name, plan_start_date, plan_end_date, plan_app_acronym],
      (err, results) => {
        if (err) {
          console.log(err);
          res.send({ message: "Plan name taken" });
        } else {
          res.send({ message: "Success" });
        }
      }
    );
  } catch {
    res.send({ message: "Plan name taken" });
  }
});

//show all plan link to project
app.get("/showplan/:appname", function (req, res) {
  db.query(
    "SELECT * FROM plan WHERE Plan_app_Acronym=?",
    [req.params.appname],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

//show one plan link to project
app.get("/showoneplan/:planname", function (req, res) {
  db.query(
    "SELECT * FROM plan WHERE Plan_MVP_name=?",
    [req.params.planname],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

//edit plan
app.post("/edit_plan", function (req, res) {
  const plan_start_date = req.body.plan_start_date;
  const plan_end_date = req.body.plan_end_date;
  const plan_name = req.body.plan_mvp_name;
  if (plan_start_date) {
    db.query(
      "UPDATE plan SET Plan_startDate=? WHERE Plan_MVP_name=?",
      [plan_start_date, plan_name],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          res.send({ message: "Plan Start Date Updated" });
        }
      }
    );
  } else if (plan_end_date) {
    db.query(
      "UPDATE plan SET Plan_endDate=? WHERE Plan_MVP_name=?",
      [plan_end_date, plan_name],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          res.send({ message: "Plan End Date Updated" });
        }
      }
    );
  }
});

//create task
app.post("/appcreatetask", function (req, res) {
  const taskid = req.body.task_app_acronym + "_" + req.body.rnumber;
  const task_name = req.body.taskname;
  const task_description = req.body.task_description;
  const task_app_acronym = req.body.task_app_acronym;
  const task_creator = req.body.task_creator;
  const task_owner = req.body.task_owner;
  const task_createdate = req.body.create_date;
  let rnumber = req.body.rnumber;
  let timestamp =
    "Userid: " +
    task_owner +
    "," +
    "Current State: Open" +
    "," +
    "Datetime " +
    datetime +
    "\n" +
    "Task Created";

  db.query(
    "INSERT INTO task(Task_id,Task_name,Task_description,Task_app_Acronym,Task_creator,Task_owner,Task_createDate,Task_notes) VALUES (?,?,?,?,?,?,?,?)",
    [
      taskid,
      task_name,
      task_description,
      task_app_acronym,
      task_creator,
      task_owner,
      task_createdate,
      timestamp,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log("All done");
        rnumber = rnumber + 1;
        db.query(
          "UPDATE application SET App_Rnumber=? WHERE App_Acronym=?",
          [rnumber, task_app_acronym],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Rnumber updated");
            }
          }
        );
      }
    }
  );
});

//show all task
app.get("/showtask/:appname", function (req, res) {
  db.query(
    "SELECT * FROM task WHERE Task_app_Acronym=?",
    [req.params.appname],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

//show single task
app.get("/showsingletask/:taskid", function (req, res) {
  db.query(
    "SELECT * FROM task WHERE Task_id=?",
    [req.params.taskid],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result[0]);
      }
    }
  );
});

//edit task
app.post("/edittask", function (req, res) {
  const task_description = req.body.task_description;
  const task_plan = req.body.task_plan;
  const task_owner = req.body.task_owner;
  const taskid = req.body.taskid;
  const taskstate = req.body.task_state;
  const task_notes = req.body.task_notes;
  const existingdes = req.body.existingdes;
  const existingplan = req.body.existingplan;
  const newnotes = req.body.newnotes;

  let Plantimestamp =
    "Userid: " +
    task_owner +
    "," +
    "Current State: " +
    taskstate +
    "," +
    "Datetime " +
    datetime +
    "\n" +
    "Plan Updated";
  let Destimestamp =
    "Userid: " +
    task_owner +
    "," +
    "Current State: " +
    taskstate +
    "," +
    "Datetime " +
    datetime +
    "\n" +
    "Description Updated";
  //update plan
  if (task_plan) {
    db.query(
      "UPDATE task SET Task_plan=?,Task_owner=? WHERE Task_id=?",
      [task_plan, task_owner, taskid],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          if (existingplan === null || existingplan === "") {
            let timestamp =
              Plantimestamp + "\n" + "<---------->" + "\n" + task_notes;
            db.query(
              "UPDATE task SET Task_notes=? WHERE Task_id=?",
              [timestamp, taskid],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("plan");
                }
              }
            );
          } else {
            let newtimestamp =
              Plantimestamp +
              "\n" +
              "From " +
              existingplan +
              "-->" +
              task_plan +
              "\n" +
              "<---------->" +
              "\n" +
              task_notes;
            db.query(
              "UPDATE task SET Task_notes=? WHERE Task_id=?",
              [newtimestamp, taskid],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("plan");
                }
              }
            );
          }
        }
      }
    );
  }
  //updating description
  else if (task_description) {
    db.query(
      "UPDATE task SET Task_description=?,Task_owner=? WHERE Task_id=?",
      [task_description, task_owner, taskid],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          if (task_notes === null || task_notes === "") {
            db.query(
              "UPDATE task SET Task_notes=? WHERE Task_id=?",
              [Destimestamp, taskid],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("des");
                }
              }
            );
          } else {
            let newtimestamp =
              Destimestamp +
              "\n" +
              "From " +
              existingdes +
              "-->" +
              task_description +
              "\n" +
              "<---------->" +
              "\n" +
              task_notes;
            db.query(
              "UPDATE task SET Task_notes=? WHERE Task_id=?",
              [newtimestamp, taskid],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("TEST");
                }
              }
            );
          }
        }
      }
    );
  } else if (newnotes) {
    db.query(
      "UPDATE task SET Task_notes=?,Task_owner=? WHERE Task_id=?",
      [newnotes, task_owner, taskid],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          let new_note =
            "Userid: " +
            task_owner +
            "," +
            "Current State: " +
            taskstate +
            "," +
            " Datetime " +
            datetime +
            "\n" +
            newnotes;
          let timestamp = new_note + "\n" + task_notes;
          db.query(
            "UPDATE task SET Task_notes=? WHERE Task_id=?",
            [timestamp, taskid],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                console.log("plan");
              }
            }
          );
        }
      }
    );
  }
});

//promote task
app.post("/promote_task", function (req, res) {
  const check_task_state = req.body.task_state;
  const userid = req.body.userid;
  const task_notes = req.body.tasknotes;

  if (check_task_state === "Open") {
    task_state = "To-do-list";
  } else if (check_task_state === "To-do-list") {
    task_state = "Doing";
  } else if (check_task_state === "Doing") {
    task_state = "Done";
  } else {
    task_state = "Close";
  }
  const taskid = req.body.taskid;
  let timestamp =
    "Userid: " +
    userid +
    "," +
    "Current State: " +
    task_state +
    "," +
    "Datetime: " +
    datetime +
    "\n" +
    "From " +
    check_task_state +
    "-->" +
    task_state +
    "\n" +
    "State Changed" +
    "\n" +
    "<---------->" +
    "\n" +
    task_notes;
  db.query(
    "UPDATE task SET Task_state=?,Task_notes=? WHERE Task_id=?",
    [task_state, timestamp, taskid],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("Done");
      }
    }
  );
});

//demote task
app.post("/demote_task", function (req, res) {
  const check_task_state = req.body.task_state;
  const userid = req.body.userid;
  const task_notes = req.body.tasknotes;
  if (check_task_state === "Done") {
    task_state = "Doing";
  } else if (check_task_state === "Doing") {
    task_state = "To-do-list";
  }
  const taskid = req.body.taskid;
  let timestamp =
    "Userid: " +
    userid +
    "," +
    "Current State: " +
    task_state +
    "," +
    "Datetime: " +
    datetime +
    "\n" +
    "From " +
    check_task_state +
    "-->" +
    task_state +
    "\n" +
    "State Changed" +
    "\n" +
    "<---------->" +
    "\n" +
    task_notes;
  db.query(
    "UPDATE task SET Task_state=?,Task_notes=? WHERE Task_id=?",
    [task_state, timestamp, taskid],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send("Done");
      }
    }
  );
});

app.get("/getallthepl", function (req, res) {
  db.query("SELECT * FROM accounts", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      let listofplemail = [];
      result.forEach((ug) => {
        if (ug.usergroup === null) {
          console.log("hi");
        } else if (ug.usergroup.includes("Project Lead")) {
          listofplemail.push(ug.email);
        }
      });
      res.send(listofplemail.toString());
    }
  });
});

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAUTH2",
    user: process.env.EMAIL,
    pass: process.env.WORD,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

transporter.verify((err, success) => {
  err
    ? console.log(err)
    : console.log(`=== Server is ready to take messages: ${success} ===`);
});

app.post("/send", function (req, res) {
  let mailOptions = {
    from: "iverynd1992@gmail.com",
    to: `${req.body.email}`,
    subject: `Message from: ${req.body.name}`,
    text: "Task has been move from Doing to Done",
  };

  transporter.sendMail(mailOptions, function (err, data) {
    if (err) {
      res.json({
        status: "fail",
      });
    } else {
      console.log("== Message Sent ==");
      res.json({
        status: "success",
      });
    }
  });
});

app.post("/CreateTask", async function (req, res) {
  const username = req.query.username;
  const password = req.query.password;
  const task_name = req.body.taskname;
  const task_description = req.body.task_description;
  const task_app_acronym = req.body.task_app_acronym;
  const task_creator = req.query.username;
  const task_owner = req.query.username;
  const task_createdate = datetime;

  if (!task_app_acronym || !username || !password) {
    return res.json({ code: "400" });
  }

  const user = await db
    .promise()
    .query("SELECT * FROM accounts WHERE username=?", [username]);

  if (!user[0][0]) {
    return res.status(401).json({ code: "401" });
  }

  const pass = await bcrypt.compare(password, user[0][0].password);
  if (!pass) {
    return res.status(401).json({ code: "401" });
  }

  if (user[0][0].status === "Disable") {
    return res.status(401).json({ code: "401" });
  } else {
    db.query(
      "SELECT App_Rnumber FROM application WHERE App_Acronym=?",
      [task_app_acronym],
      (err, result) => {
        try {
          if (err) {
            console.log(err);
          } else {
            let rnumber = result[0].App_Rnumber;
            const taskid = req.body.task_app_acronym + "_" + rnumber;
            db.query(
              "INSERT INTO task(Task_id,Task_name,Task_description,Task_app_Acronym,Task_creator,Task_owner,Task_createDate) VALUES (?,?,?,?,?,?,?)",
              [
                taskid,
                task_name,
                task_description,
                task_app_acronym,
                task_creator,
                task_owner,
                task_createdate,
              ],
              (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log("All done");
                  rnumber = rnumber + 1;
                  db.query(
                    "UPDATE application SET App_Rnumber=? WHERE App_Acronym=?",
                    [rnumber, task_app_acronym],
                    (err, result) => {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log("Rnumber updated");
                        return res.status(200).json({
                          task_id: taskid,
                          code: "200",
                        });
                      }
                    }
                  );
                }
              }
            );
          }
        } catch {
          return res.status(405).json({ code: "405" });
        }
      }
    );
  }
});

//show task state
app.get(
  "/GetTaskbyState/:task_state/:app_acronym/:username/:password",
  async function (req, res) {
    const username = req.params.username;
    const app_acronym = req.params.app_acronym;
    const password = req.params.password;
    const task_state = req.params.task_state;

    if (!username || !password || !task_state || !app_acronym) {
      return res.json({ code: "404" });
    }

    const user = await db
      .promise()
      .query("SELECT * FROM accounts WHERE username=?", [username]);

    if (!user[0][0]) {
      return res.status(401).json({ code: "401" });
    }

    const pass = await bcrypt.compare(password, user[0][0].password);
    if (!pass) {
      return res.status(401).json({ code: "401" });
    }

    if (user[0][0].status === "Disable") {
      return res.status(401).json({ code: "401" });
    }
    console.log(app_acronym);
    let application = await db
      .promise()
      .query("SELECT * FROM application WHERE App_Acronym=?", [app_acronym]);
    if (!application[0][0]) {
      return res.status(405).json({ code: "405" });
    }
    let list_state_acronym = await db
      .promise()
      .query("SELECT * FROM task WHERE Task_state=? && Task_app_Acronym=?", [
        task_state,
        app_acronym,
      ]);

    if (!list_state_acronym) {
      return res.status(406).json({ code: "406" });
    }

    // db.query(
    //   "SELECT * FROM task WHERE Task_state=? && Task_app_Acronym=?",
    //   [task_state, app_acronym],
    //   (err, result) => {
    //     try {
    //       if (
    //         result[0].Task_state === "Open" ||
    //         result[0].Task_state === "To-do-list" ||
    //         result[0].Task_state === "Doing" ||
    //         result[0].Task_state === "Done" ||
    //         result[0].Task_state === "Close"
    //       ) {
    //         return res.json({ code: "200", tasks: result[0] });
    //       } else {
    //         return res.json({ code: "406" });
    //       }
    //     } catch {
    //       return res.json({ code: "406" });
    //     }
    //   }
    // );
    return res.status(200).json({ code: "200" });
  }
);

app.put(
  "/PromoteTask2Done/:task_id/:username/:password",
  async function (req, res) {
    const username = req.params.username;
    const password = req.params.password;
    const task_id = req.params.task_id;
    const task_state = "Done";

    if (!username || !password || !task_id) {
      return res.json({ code: "404" });
    }
    const user = await db
      .promise()
      .query("SELECT * FROM accounts WHERE username=?", [username]);

    if (!user[0][0]) {
      return res.status(401).json({ code: "401" });
    }

    const pass = await bcrypt.compare(password, user[0][0].password);
    if (!pass) {
      return res.status(401).json({ code: "401" });
    }

    if (user[0][0].status === "Disable") {
      return res.status(401).json({ code: "403" });
    }

    const task = await db
      .promise()
      .query("SELECT * FROM task WHERE Task_id=?", [task_id]);

    if (!task[0][0]) {
      return res.status(407).json({ code: "407" });
    }

    const permit = await db
      .promise()
      .query("SELECT * FROM application WHERE App_Acronym=?", [
        task[0][0].Task_app_Acronym,
      ]);
    if (!user[0][0].usergroup.includes(permit[0][0].App_permit_Doing)) {
      res.status(403).json({ code: "403" });
    }

    const checkgroup = await db
      .promise()
      .query("SELECT email FROM accounts WHERE usergroup LIKE '%Project Lead'");
    let listofplemail = [];
    checkgroup[0].forEach((ug) => {
      listofplemail.push(ug.email);
    });
    let AllPLemail = listofplemail.toString();

    if (task[0][0].Task_state !== "Doing") {
      return res.status(406).json({ code: "406" });
    } else {
      db.query(
        "UPDATE task SET Task_state=? WHERE Task_id=?",
        [task_state, task_id],
        (err, result) => {
          if (err) {
            console.log(err);
          } else {
            let mailOptions = {
              from: "iverynd1992@gmail.com",
              to: AllPLemail,
              subject: "Task has been move from Doing to Done",
              text: task_id + " has been move from Doing to Done",
            };

            transporter.sendMail(mailOptions, function (err, data) {
              if (err) {
                res.json({
                  status: "fail",
                });
              } else {
                console.log("== Message Sent ==");
                res.json({
                  status: "success",
                });
              }
            });
          }
        }
      );
    }

    res.status(200).json({ code: "200" });
  }
);

app.listen(3001, () => {
  console.log("Hi,I am running!");
});
