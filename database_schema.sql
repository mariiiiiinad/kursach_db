CREATE TABLE IF NOT EXISTS policlinic (
    policlinic_id SERIAL PRIMARY KEY,
    policlinic_name VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    phone VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS specialization (
    specialization_id SERIAL PRIMARY KEY,
    specialization_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS patient (
    patient_id SERIAL PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER,
    address VARCHAR(255),
    patient_phone VARCHAR(50),
    date_of_birth DATE
);

CREATE TABLE IF NOT EXISTS doctor (
    doctor_id SERIAL PRIMARY KEY,
    doctor_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    specialization_id INTEGER NOT NULL REFERENCES specialization(specialization_id),
    experience VARCHAR(100),
    address VARCHAR(255),
    doctor_phone VARCHAR(50),
    policlinic_id INTEGER NOT NULL REFERENCES policlinic(policlinic_id),
    CONSTRAINT uq_doctor_name_clinic UNIQUE (doctor_name, policlinic_id)
);

CREATE TABLE IF NOT EXISTS service (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS doctor_service (
    doctor_service_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES service(service_id),
    service_price NUMERIC(10, 2) NOT NULL CHECK (service_price >= 0),
    CONSTRAINT uq_doctor_service UNIQUE (doctor_id, service_id)
);

CREATE TABLE IF NOT EXISTS doctor_availability (
    availability_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctor(doctor_id) ON DELETE CASCADE,
    available_date TIMESTAMP NOT NULL,
    CONSTRAINT uq_doctor_availability UNIQUE (doctor_id, available_date)
);

CREATE TABLE IF NOT EXISTS appointment (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient(patient_id),
    doctor_service_id INTEGER NOT NULL REFERENCES doctor_service(doctor_service_id),
    appointment_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS medical_record (
    medical_record_id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
