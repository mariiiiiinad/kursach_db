INSERT INTO policlinic (policlinic_name, address, phone)
VALUES
    ('Центральная поликлиника', 'ул. Ленина, 12', '+7 (495) 100-10-10'),
    ('Северный медицинский центр', 'пр. Мира, 45', '+7 (495) 200-20-20'),
    ('Клиника профилактики', 'ул. Победы, 8', '+7 (495) 300-30-30')
ON CONFLICT (policlinic_name) DO UPDATE
SET address = EXCLUDED.address,
    phone = EXCLUDED.phone;

INSERT INTO specialization (specialization_name)
VALUES
    ('Терапевт'),
    ('Кардиолог'),
    ('Невролог'),
    ('Педиатр'),
    ('Эндокринолог')
ON CONFLICT (specialization_name) DO NOTHING;

INSERT INTO patient (patient_name, age, address, patient_phone, date_of_birth)
SELECT *
FROM (
    VALUES
        ('Иванов Иван Сергеевич', 31, 'ул. Садовая, 17', '+7 (999) 101-11-11', '1993-05-14'::date),
        ('Петрова Анна Ильинична', 26, 'ул. Лесная, 22', '+7 (999) 202-22-22', '1998-11-02'::date),
        ('Смирнов Олег Павлович', 42, 'ул. Речная, 9', '+7 (999) 303-33-33', '1982-08-21'::date)
) AS v(patient_name, age, address, patient_phone, date_of_birth)
WHERE NOT EXISTS (
    SELECT 1
    FROM patient p
    WHERE p.patient_name = v.patient_name
      AND p.date_of_birth = v.date_of_birth
);

INSERT INTO doctor (doctor_name, room_number, specialization_id, experience, address, doctor_phone, policlinic_id)
SELECT * FROM (
    VALUES
        ('Морозова Елена Викторовна', '101', (SELECT specialization_id FROM specialization WHERE specialization_name = 'Терапевт'), '8 лет', 'ул. Ленина, 12', '+7 (495) 400-10-01', (SELECT policlinic_id FROM policlinic WHERE policlinic_name = 'Центральная поликлиника')),
        ('Соколов Артем Андреевич', '204', (SELECT specialization_id FROM specialization WHERE specialization_name = 'Кардиолог'), '12 лет', 'ул. Ленина, 12', '+7 (495) 400-10-02', (SELECT policlinic_id FROM policlinic WHERE policlinic_name = 'Центральная поликлиника')),
        ('Крылова Мария Денисовна', '17', (SELECT specialization_id FROM specialization WHERE specialization_name = 'Невролог'), '6 лет', 'пр. Мира, 45', '+7 (495) 500-20-01', (SELECT policlinic_id FROM policlinic WHERE policlinic_name = 'Северный медицинский центр')),
        ('Орлов Никита Игоревич', '11', (SELECT specialization_id FROM specialization WHERE specialization_name = 'Педиатр'), '9 лет', 'пр. Мира, 45', '+7 (495) 500-20-02', (SELECT policlinic_id FROM policlinic WHERE policlinic_name = 'Северный медицинский центр')),
        ('Жукова Полина Сергеевна', '303', (SELECT specialization_id FROM specialization WHERE specialization_name = 'Эндокринолог'), '11 лет', 'ул. Победы, 8', '+7 (495) 600-30-01', (SELECT policlinic_id FROM policlinic WHERE policlinic_name = 'Клиника профилактики'))
) AS v(doctor_name, room_number, specialization_id, experience, address, doctor_phone, policlinic_id)
ON CONFLICT (doctor_name, policlinic_id) DO UPDATE
SET room_number = EXCLUDED.room_number,
    specialization_id = EXCLUDED.specialization_id,
    experience = EXCLUDED.experience,
    address = EXCLUDED.address,
    doctor_phone = EXCLUDED.doctor_phone;

INSERT INTO service (service_name, description)
VALUES
    ('Первичный прием', 'Первичная консультация специалиста'),
    ('Повторный прием', 'Повторная консультация по результатам лечения'),
    ('ЭКГ', 'Электрокардиографическое исследование'),
    ('Профилактический осмотр', 'Плановый профилактический осмотр'),
    ('Консультация по анализам', 'Разбор лабораторных исследований')
ON CONFLICT (service_name) DO NOTHING;

INSERT INTO doctor_service (doctor_id, service_id, service_price)
SELECT d.doctor_id, s.service_id, v.price
FROM (
    VALUES
        ('Морозова Елена Викторовна', 'Центральная поликлиника', 'Первичный прием', 1800.00),
        ('Морозова Елена Викторовна', 'Центральная поликлиника', 'Повторный прием', 1400.00),
        ('Соколов Артем Андреевич', 'Центральная поликлиника', 'ЭКГ', 2100.00),
        ('Соколов Артем Андреевич', 'Центральная поликлиника', 'Первичный прием', 2500.00),
        ('Крылова Мария Денисовна', 'Северный медицинский центр', 'Первичный прием', 2300.00),
        ('Крылова Мария Денисовна', 'Северный медицинский центр', 'Консультация по анализам', 1900.00),
        ('Орлов Никита Игоревич', 'Северный медицинский центр', 'Профилактический осмотр', 1700.00),
        ('Жукова Полина Сергеевна', 'Клиника профилактики', 'Первичный прием', 2600.00)
) AS v(doctor_name, policlinic_name, service_name, price)
JOIN doctor d ON d.doctor_name = v.doctor_name
JOIN policlinic p ON p.policlinic_id = d.policlinic_id AND p.policlinic_name = v.policlinic_name
JOIN service s ON s.service_name = v.service_name
ON CONFLICT (doctor_id, service_id) DO UPDATE
SET service_price = EXCLUDED.service_price;

INSERT INTO doctor_availability (doctor_id, available_date)
SELECT d.doctor_id, v.available_date
FROM (
    VALUES
        ('Морозова Елена Викторовна', 'Центральная поликлиника', '2026-05-06 10:00:00'::timestamp),
        ('Морозова Елена Викторовна', 'Центральная поликлиника', '2026-05-07 12:30:00'::timestamp),
        ('Соколов Артем Андреевич', 'Центральная поликлиника', '2026-05-06 14:00:00'::timestamp),
        ('Крылова Мария Денисовна', 'Северный медицинский центр', '2026-05-08 09:15:00'::timestamp),
        ('Орлов Никита Игоревич', 'Северный медицинский центр', '2026-05-08 16:45:00'::timestamp),
        ('Жукова Полина Сергеевна', 'Клиника профилактики', '2026-05-09 11:00:00'::timestamp)
) AS v(doctor_name, policlinic_name, available_date)
JOIN doctor d ON d.doctor_name = v.doctor_name
JOIN policlinic p ON p.policlinic_id = d.policlinic_id AND p.policlinic_name = v.policlinic_name
ON CONFLICT (doctor_id, available_date) DO NOTHING;

INSERT INTO appointment (patient_id, doctor_service_id, appointment_date, status)
SELECT pt.patient_id, ds.doctor_service_id, '2026-05-10 13:00:00'::timestamp, 'scheduled'
FROM patient pt
JOIN doctor d ON d.doctor_name = 'Морозова Елена Викторовна'
JOIN policlinic p ON p.policlinic_id = d.policlinic_id AND p.policlinic_name = 'Центральная поликлиника'
JOIN service s ON s.service_name = 'Повторный прием'
JOIN doctor_service ds ON ds.doctor_id = d.doctor_id AND ds.service_id = s.service_id
WHERE pt.patient_name = 'Иванов Иван Сергеевич'
  AND NOT EXISTS (
    SELECT 1
    FROM appointment a
    WHERE a.patient_id = pt.patient_id
      AND a.doctor_service_id = ds.doctor_service_id
      AND a.appointment_date = '2026-05-10 13:00:00'::timestamp
  );
