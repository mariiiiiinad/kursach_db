const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const DB_NAME = process.env.DB_NAME || "hosdb";
const DB_USER = process.env.DB_USER || process.env.USER || "marinaazizova";
const PUBLIC_DIR = path.join(__dirname, "public");

function sqlEscape(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

async function runPsql(query) {
  const args = ["-d", DB_NAME, "-U", DB_USER, "-t", "-A", "-c", query];
  try {
    const { stdout, stderr } = await execFileAsync("psql", args, {
      env: { ...process.env, PGHOST: process.env.PGHOST || "" },
      maxBuffer: 1024 * 1024 * 8,
    });

    if (stderr && stderr.trim()) {
      const trimmed = stderr.trim();
      if (!trimmed.startsWith("NOTICE:")) {
        throw new Error(trimmed);
      }
    }

    return stdout.trim();
  } catch (error) {
    throw new Error(error.stderr?.trim() || error.message);
  }
}

async function queryJson(query) {
  const wrapped = `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (${query}) t;`;
  const output = await runPsql(wrapped);
  return JSON.parse(output || "[]");
}

async function mutateJson(query) {
  const wrapped = `WITH t AS (${query}) SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM t;`;
  const output = await runPsql(wrapped);
  return JSON.parse(output || "[]");
}

async function queryValue(query) {
  return runPsql(query);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "File not found" });
      return;
    }
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      const dbName = await queryValue("SELECT current_database();");
      sendJson(res, 200, { ok: true, database: dbName, user: DB_USER });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    try {
      const rows = await queryJson(`
        SELECT
          (SELECT COUNT(*) FROM patient) AS patients,
          (SELECT COUNT(*) FROM doctor) AS doctors,
          (SELECT COUNT(*) FROM appointment) AS appointments,
          (SELECT COUNT(*) FROM policlinic) AS policlinics
      `);
      sendJson(res, 200, rows[0] || {});
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/policlinics") {
    try {
      const rows = await queryJson(`
        SELECT policlinic_id AS id, policlinic_name AS name, address, phone
        FROM policlinic
        ORDER BY policlinic_name
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/patients") {
    const q = url.searchParams.get("q");
    try {
      const rows = await queryJson(`
        SELECT patient_id AS id,
               patient_name AS name,
               age,
               address,
               patient_phone,
               to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
        FROM patient
        ${q ? `WHERE patient_name ILIKE ${sqlEscape(`%${q}%`)}` : ""}
        ORDER BY patient_name
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/specializations") {
    const policlinicId = url.searchParams.get("policlinicId");
    try {
      const rows = await queryJson(`
        SELECT DISTINCT s.specialization_id AS id, s.specialization_name AS name
        FROM specialization s
        JOIN doctor d ON d.specialization_id = s.specialization_id
        ${policlinicId ? `WHERE d.policlinic_id = ${Number(policlinicId)}` : ""}
        ORDER BY s.specialization_name
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/doctors") {
    const policlinicId = url.searchParams.get("policlinicId");
    const specializationId = url.searchParams.get("specializationId");
    const conditions = [];
    if (policlinicId) conditions.push(`d.policlinic_id = ${Number(policlinicId)}`);
    if (specializationId) conditions.push(`d.specialization_id = ${Number(specializationId)}`);

    try {
      const rows = await queryJson(`
        SELECT d.doctor_id AS id,
               d.doctor_name AS name,
               d.room_number,
               d.experience,
               d.address,
               d.doctor_phone,
               s.specialization_name AS specialization
        FROM doctor d
        JOIN specialization s ON s.specialization_id = d.specialization_id
        ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY d.doctor_name
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/services") {
    const doctorIdParam = url.searchParams.get("doctorId");
    const doctorId = Number(doctorIdParam);

    try {
      const rows = doctorIdParam
        ? await queryJson(`
            SELECT ds.doctor_service_id AS id,
                   s.service_name AS name,
         s.description AS description,
                   ds.service_price AS price
            FROM doctor_service ds
            JOIN service s ON s.service_id = ds.service_id
            WHERE ds.doctor_id = ${doctorId}
            ORDER BY s.service_name
          `)
        : await queryJson(`
       SELECT service_id AS id,
         service_name AS name,
         description
            FROM service
            ORDER BY service_name
          `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/availability") {
    const doctorId = Number(url.searchParams.get("doctorId"));
    if (!doctorId) {
      sendJson(res, 400, { error: "doctorId is required" });
      return true;
    }

    try {
      const rows = await queryJson(`
        SELECT availability_id AS id,
               to_char(available_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS value,
               to_char(available_date, 'DD.MM.YYYY HH24:MI') AS label
        FROM doctor_availability
        WHERE doctor_id = ${doctorId}
        ORDER BY available_date
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/appointments/search") {
    const patientName = url.searchParams.get("patientName");
    const serviceName = url.searchParams.get("serviceName");
    if (!patientName || !serviceName) {
      sendJson(res, 400, { error: "patientName and serviceName are required" });
      return true;
    }

    try {
      const rows = await queryJson(`
        SELECT a.appointment_id AS id,
               pt.patient_name,
               p.policlinic_name,
               d.doctor_name,
               s.service_name,
               to_char(a.appointment_date, 'DD.MM.YYYY HH24:MI') AS appointment_date,
               a.status
        FROM appointment a
        JOIN patient pt ON pt.patient_id = a.patient_id
        JOIN doctor_service ds ON ds.doctor_service_id = a.doctor_service_id
        JOIN doctor d ON d.doctor_id = ds.doctor_id
        JOIN policlinic p ON p.policlinic_id = d.policlinic_id
        JOIN service s ON s.service_id = ds.service_id
        WHERE pt.patient_name = ${sqlEscape(patientName)}
          AND s.service_name = ${sqlEscape(serviceName)}
        ORDER BY a.appointment_date DESC
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/appointments") {
    try {
      const rows = await queryJson(`
        SELECT a.appointment_id AS id,
               pt.patient_id,
               pt.patient_name,
               p.policlinic_name,
               d.doctor_id,
               d.doctor_name,
               s.service_name,
               ds.doctor_service_id,
               ds.service_price,
               to_char(a.appointment_date, 'DD.MM.YYYY HH24:MI') AS appointment_date,
               to_char(a.appointment_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS appointment_value,
               a.status,
               mr.medical_record_id,
               mr.diagnosis,
               mr.treatment,
               mr.notes,
               to_char(mr.created_at, 'DD.MM.YYYY HH24:MI') AS medical_record_created_at
        FROM appointment a
        JOIN patient pt ON pt.patient_id = a.patient_id
        JOIN doctor_service ds ON ds.doctor_service_id = a.doctor_service_id
        JOIN doctor d ON d.doctor_id = ds.doctor_id
        JOIN policlinic p ON p.policlinic_id = d.policlinic_id
        JOIN service s ON s.service_id = ds.service_id
        LEFT JOIN medical_record mr ON mr.appointment_id = a.appointment_id
        ORDER BY a.appointment_date DESC
      `);
      sendJson(res, 200, rows);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/medical-records") {
    const appointmentId = Number(url.searchParams.get("appointmentId"));
    if (!appointmentId) {
      sendJson(res, 400, { error: "appointmentId is required" });
      return true;
    }
    try {
      const rows = await queryJson(`
        SELECT medical_record_id AS id,
               appointment_id,
               diagnosis,
               treatment,
               notes,
               to_char(created_at, 'DD.MM.YYYY HH24:MI') AS created_at
        FROM medical_record
        WHERE appointment_id = ${appointmentId}
      `);
      sendJson(res, 200, rows[0] || null);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/patients") {
    const body = await parseBody(req);
    try {
      const result = await mutateJson(`
        INSERT INTO patient (patient_name, age, address, patient_phone, date_of_birth)
        VALUES (
          ${sqlEscape(body.patient_name)},
          ${Number(body.age || 0)},
          ${sqlEscape(body.address)},
          ${sqlEscape(body.patient_phone)},
          ${sqlEscape(body.date_of_birth)}
        )
        RETURNING patient_id AS id, patient_name
      `);
      sendJson(res, 201, result[0]);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/doctor") {
    const body = await parseBody(req);
    try {
      await runPsql(`
        INSERT INTO policlinic (policlinic_name, address, phone)
        VALUES (${sqlEscape(body.policlinic_name)}, ${sqlEscape(body.address)}, ${sqlEscape(body.phone)})
        ON CONFLICT (policlinic_name)
        DO UPDATE SET address = EXCLUDED.address, phone = EXCLUDED.phone;
      `);

      await runPsql(`
        INSERT INTO specialization (specialization_name)
        VALUES (${sqlEscape(body.specialization_name)})
        ON CONFLICT (specialization_name) DO NOTHING;
      `);

      const doctorRows = await mutateJson(`
        INSERT INTO doctor (doctor_name, room_number, specialization_id, experience, address, doctor_phone, policlinic_id)
        VALUES (
          ${sqlEscape(body.doctor_name)},
          ${sqlEscape(body.room_number)},
          (SELECT specialization_id FROM specialization WHERE specialization_name = ${sqlEscape(body.specialization_name)}),
          ${sqlEscape(body.experience)},
          ${sqlEscape(body.address)},
          ${sqlEscape(body.phone)},
          (SELECT policlinic_id FROM policlinic WHERE policlinic_name = ${sqlEscape(body.policlinic_name)})
        )
        ON CONFLICT (doctor_name, policlinic_id)
        DO UPDATE SET
          room_number = EXCLUDED.room_number,
          specialization_id = EXCLUDED.specialization_id,
          experience = EXCLUDED.experience,
          address = EXCLUDED.address,
          doctor_phone = EXCLUDED.doctor_phone
        RETURNING doctor_id AS id
      `);

      await runPsql(`
        INSERT INTO service (service_name, description)
        VALUES (${sqlEscape(body.service_name)}, ${sqlEscape(body.service_description)})
        ON CONFLICT (service_name)
        DO UPDATE SET description = EXCLUDED.description;
      `);

      await runPsql(`
        INSERT INTO doctor_service (doctor_id, service_id, service_price)
        VALUES (
          ${doctorRows[0].id},
          (SELECT service_id FROM service WHERE service_name = ${sqlEscape(body.service_name)}),
          ${Number(body.service_price)}
        )
        ON CONFLICT (doctor_id, service_id)
        DO UPDATE SET service_price = EXCLUDED.service_price;
      `);

      await runPsql(`
        INSERT INTO doctor_availability (doctor_id, available_date)
        VALUES (${doctorRows[0].id}, ${sqlEscape(body.available_date)})
        ON CONFLICT (doctor_id, available_date) DO NOTHING;
      `);

      sendJson(res, 201, { ok: true, doctor_id: doctorRows[0].id });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/appointments") {
    const body = await parseBody(req);
    try {
      const patientRows = await queryJson(`
        SELECT patient_id AS id
        FROM patient
        WHERE patient_name = ${sqlEscape(body.patient_name)}
        LIMIT 1
      `);

      if (!patientRows.length) {
        sendJson(res, 404, { error: "Patient not found" });
        return true;
      }

      const statusValue = body.status ? String(body.status) : 'scheduled';
      const result = await mutateJson(`
        INSERT INTO appointment (patient_id, doctor_service_id, appointment_date, status)
        VALUES (
          ${patientRows[0].id},
          ${Number(body.doctor_service_id)},
          ${sqlEscape(body.appointment_date)},
          ${sqlEscape(statusValue)}
        )
        RETURNING appointment_id AS id
      `);

      await runPsql(`
        DELETE FROM doctor_availability
        WHERE doctor_id = ${Number(body.doctor_id)}
          AND available_date = ${sqlEscape(body.appointment_date)};
      `);

      sendJson(res, 201, { ok: true, appointment_id: result[0].id });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/medical-records") {
    const body = await parseBody(req);
    try {
      const result = await mutateJson(`
        INSERT INTO medical_record (appointment_id, diagnosis, treatment, notes)
        VALUES (
          ${Number(body.appointment_id)},
          ${sqlEscape(body.diagnosis)},
          ${sqlEscape(body.treatment)},
          ${sqlEscape(body.notes)}
        )
        ON CONFLICT (appointment_id)
        DO UPDATE SET
          diagnosis = EXCLUDED.diagnosis,
          treatment = EXCLUDED.treatment,
          notes = EXCLUDED.notes
        RETURNING medical_record_id AS id, appointment_id
      `);
      // If caller provided a status, update appointment.status as well
      if (body.status) {
        await runPsql(`
          UPDATE appointment
          SET status = ${sqlEscape(body.status)}
          WHERE appointment_id = ${Number(result[0].appointment_id)};
        `);
      }

      sendJson(res, 201, result[0]);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) {
        sendJson(res, 404, { error: "API route not found" });
      }
      return;
    }

    const filePath = url.pathname === "/"
      ? path.join(PUBLIC_DIR, "index.html")
      : path.join(PUBLIC_DIR, url.pathname);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }

    sendFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Web app is running on http://${HOST}:${PORT}`);
  console.log(`Using database '${DB_NAME}' with user '${DB_USER}'.`);
});
