const state = {
  patients: [],
  policlinics: [],
  specializations: [],
  doctors: [],
  services: [],
  allServices: [],
  availability: [],
  appointments: [],
  selectedDoctor: null,
  selectedService: null,
  selectedAppointment: null,
};

const statusMap = {
  scheduled: "Запись подтверждена",
  completed: "Прием завершен",
  cancelled: "Запись отменена",
};

const els = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  panels: Array.from(document.querySelectorAll(".panel")),
  toast: document.getElementById("toast"),
  stats: {
    patients: document.getElementById("stat-patients"),
    doctors: document.getElementById("stat-doctors"),
    appointments: document.getElementById("stat-appointments"),
    policlinics: document.getElementById("stat-policlinics"),
  },
  booking: {
    patient: document.getElementById("patientSelect"),
    patientNoMiddleName: document.getElementById("patientNoMiddleName"),
    policlinic: document.getElementById("policlinicSelect"),
    specialization: document.getElementById("specializationSelect"),
    doctor: document.getElementById("doctorSelect"),
    service: document.getElementById("serviceSelect"),
    availability: document.getElementById("availabilitySelect"),
    summary: document.getElementById("bookingSummary"),
    button: document.getElementById("bookButton"),
  },
  appointments: {
    list: document.getElementById("appointmentsList"),
    summary: document.getElementById("medicalRecordSummary"),
    diagnosis: document.getElementById("medicalDiagnosis"),
    treatment: document.getElementById("medicalTreatment"),
    notes: document.getElementById("medicalNotes"),
    button: document.getElementById("saveMedicalRecordButton"),
  },
  search: {
    patient: document.getElementById("searchPatientName"),
    noMiddleName: document.getElementById("searchNoMiddleName"),
    service: document.getElementById("searchServiceName"),
    button: document.getElementById("searchButton"),
    results: document.getElementById("searchResults"),
  },
  patients: {
    name: document.getElementById("newPatientName"),
    noMiddleName: document.getElementById("newPatientNoMiddleName"),
    age: document.getElementById("newPatientAge"),
    address: document.getElementById("newPatientAddress"),
    phone: document.getElementById("newPatientPhone"),
    birthday: document.getElementById("newPatientBirthday"),
    button: document.getElementById("savePatientButton"),
  },
  admin: {
    policlinic: document.getElementById("adminPoliclinic"),
    address: document.getElementById("adminAddress"),
    phone: document.getElementById("adminPhone"),
    doctor: document.getElementById("adminDoctor"),
    doctorNoMiddleName: document.getElementById("adminDoctorNoMiddleName"),
    room: document.getElementById("adminRoom"),
    specialization: document.getElementById("adminSpecialization"),
    experience: document.getElementById("adminExperience"),
    service: document.getElementById("adminService"),
    price: document.getElementById("adminPrice"),
    availability: document.getElementById("adminAvailability"),
    button: document.getElementById("saveDoctorButton"),
  },
};

const validatedFields = [
  els.booking.patient,
  els.booking.policlinic,
  els.booking.specialization,
  els.booking.doctor,
  els.booking.service,
  els.booking.availability,
  els.search.patient,
  els.search.service,
  els.patients.name,
  els.patients.age,
  els.patients.address,
  els.patients.phone,
  els.patients.birthday,
  els.admin.policlinic,
  els.admin.address,
  els.admin.phone,
  els.admin.doctor,
  els.admin.room,
  els.admin.specialization,
  els.admin.experience,
  els.admin.service,
  els.admin.price,
  els.admin.availability,
  els.appointments.diagnosis,
  els.appointments.treatment,
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  els.toast.style.background = isError ? "#a53d2b" : "#0b3f3b";
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 3400);
}

function renderOptions(select, items, placeholder, valueKey = "id", labelKey = "name") {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    select.appendChild(option);
  });
}

function clearFieldErrors() {
  validatedFields.forEach(field => field?.classList.remove("field-invalid"));
}

function markFieldInvalid(field) {
  field?.classList.add("field-invalid");
}

function failValidation(message, field) {
  if (field) {
    clearFieldErrors();
    markFieldInvalid(field);
    field.focus();
  }
  showToast(message, true);
  return false;
}

function getNameParts(value) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function isNamePartValid(part) {
  return /^[A-Za-zА-Яа-яЁё-]+$/.test(part);
}

function validateFullName(value, noMiddleNameChecked, fieldLabel) {
  if (!value.trim()) {
    return `Заполните поле «${fieldLabel}» до конца.`;
  }

  const parts = getNameParts(value);
  const minParts = noMiddleNameChecked ? 2 : 3;

  if (parts.length < minParts || parts.length > 3) {
    if (noMiddleNameChecked) {
      return `Для поля «${fieldLabel}» введите фамилию и имя или полное ФИО.`;
    }
    return `Для поля «${fieldLabel}» введите фамилию, имя и отчество или поставьте галочку «нет отчества».`;
  }

  if (!parts.every(isNamePartValid)) {
    return `Поле «${fieldLabel}» должно содержать только буквы и дефис.`;
  }

  return null;
}

function validatePhone(value, fieldLabel) {
  if (!value.trim()) {
    return `Заполните поле «${fieldLabel}».`;
  }
  const digits = value.replace(/\D/g, "");
  if (!(digits.length === 10 || digits.length === 11)) {
    return `Поле «${fieldLabel}» должно содержать 10 или 11 цифр.`;
  }
  return null;
}

function validateRequired(value, fieldLabel) {
  if (!String(value ?? "").trim()) {
    return `Заполните поле «${fieldLabel}».`;
  }
  return null;
}

function validateAge(value) {
  if (!String(value).trim()) {
    return "Заполните поле «Возраст».";
  }
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return "Возраст должен быть целым числом от 0 до 120.";
  }
  return null;
}

function validatePrice(value) {
  if (!String(value).trim()) {
    return "Заполните поле «Стоимость».";
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    return "Стоимость услуги должна быть больше нуля.";
  }
  return null;
}

function validateDateNotFuture(value, fieldLabel) {
  if (!String(value).trim()) {
    return `Заполните поле «${fieldLabel}».`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `Поле «${fieldLabel}» заполнено в неверном формате.`;
  }
  if (date > new Date()) {
    return `Поле «${fieldLabel}» не может быть в будущем.`;
  }
  return null;
}

function validateFutureDateTime(value, fieldLabel) {
  if (!String(value).trim()) {
    return `Заполните поле «${fieldLabel}».`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `Поле «${fieldLabel}» заполнено в неверном формате.`;
  }
  if (date <= new Date()) {
    return `Поле «${fieldLabel}» должно содержать будущую дату и время.`;
  }
  return null;
}

function getSelectedPatientName(select) {
  const item = state.patients.find(patient => String(patient.id) === String(select.value));
  return item ? item.name : "";
}

function renderSummary() {
  const patientName = getSelectedPatientName(els.booking.patient);
  const policlinic = state.policlinics.find(item => String(item.id) === String(els.booking.policlinic.value));
  const specialization = state.specializations.find(item => String(item.id) === String(els.booking.specialization.value));
  const doctor = state.selectedDoctor;
  const service = state.services.find(item => String(item.id) === String(els.booking.service.value));
  const availability = state.availability.find(item => item.value === els.booking.availability.value);

  if (!patientName && !policlinic && !doctor && !service) {
    els.booking.summary.innerHTML = "<p>Выберите пациента и параметры приема, чтобы увидеть итоговую карточку записи.</p>";
    return;
  }

  els.booking.summary.innerHTML = `
    <h3>${doctor ? doctor.name : "Ожидание выбора врача"}</h3>
    <p><strong>Пациент:</strong> ${patientName || "не выбран"}</p>
    <p><strong>Поликлиника:</strong> ${policlinic ? policlinic.name : "не выбрана"}</p>
    <p><strong>Специализация:</strong> ${specialization ? specialization.name : "не выбрана"}</p>
    <p><strong>Услуга:</strong> ${service ? `${service.name} · ${service.price} ₽` : "не выбрана"}</p>
    <p><strong>Дата:</strong> ${availability ? availability.label : "не выбрана"}</p>
  `;
}

function renderAppointmentsList() {
  if (!state.appointments.length) {
    els.appointments.list.innerHTML = "<p>Записей пока нет.</p>";
    return;
  }

  els.appointments.list.innerHTML = state.appointments.map(item => `
    <article class="appointment-card ${state.selectedAppointment && state.selectedAppointment.id === item.id ? "active" : ""}" data-id="${item.id}">
      <h3>${item.patient_name}</h3>
      <div class="appointment-meta">
        <div><strong>Врач:</strong> ${item.doctor_name}</div>
        <div><strong>Услуга:</strong> ${item.service_name}</div>
        <div><strong>Дата:</strong> ${item.appointment_date}</div>
        <div><strong>Статус:</strong> ${statusMap[item.status] || item.status}</div>
      </div>
    </article>
  `).join("");

  els.appointments.list.querySelectorAll(".appointment-card").forEach(card => {
    card.addEventListener("click", () => {
      const appointment = state.appointments.find(item => String(item.id) === card.dataset.id);
      selectAppointment(appointment);
    });
  });
}

function renderMedicalRecordPanel() {
  if (!state.selectedAppointment) {
    els.appointments.summary.innerHTML = "<p>Сначала выберите запись пациента из списка.</p>";
    els.appointments.diagnosis.value = "";
    els.appointments.treatment.value = "";
    els.appointments.notes.value = "";
    return;
  }

  els.appointments.summary.innerHTML = `
    <h3>${state.selectedAppointment.patient_name}</h3>
    <p><strong>Поликлиника:</strong> ${state.selectedAppointment.policlinic_name}</p>
    <p><strong>Врач:</strong> ${state.selectedAppointment.doctor_name}</p>
    <p><strong>Услуга:</strong> ${state.selectedAppointment.service_name}</p>
    <p><strong>Дата приема:</strong> ${state.selectedAppointment.appointment_date}</p>
  `;

  els.appointments.diagnosis.value = state.selectedAppointment.diagnosis || "";
  els.appointments.treatment.value = state.selectedAppointment.treatment || "";
  els.appointments.notes.value = state.selectedAppointment.notes || "";
}

function selectAppointment(appointment) {
  state.selectedAppointment = appointment || null;
  renderAppointmentsList();
  renderMedicalRecordPanel();
}

async function loadDashboard() {
  const stats = await api("/api/dashboard");
  els.stats.patients.textContent = stats.patients || 0;
  els.stats.doctors.textContent = stats.doctors || 0;
  els.stats.appointments.textContent = stats.appointments || 0;
  els.stats.policlinics.textContent = stats.policlinics || 0;
}

async function loadPatients() {
  state.patients = await api("/api/patients");
  renderOptions(els.booking.patient, state.patients, "Выберите пациента");
  renderOptions(els.search.patient, state.patients, "Выберите пациента");
}

async function loadPoliclinics() {
  state.policlinics = await api("/api/policlinics");
  renderOptions(els.booking.policlinic, state.policlinics, "Выберите поликлинику");
}

async function loadAllServices() {
  state.allServices = await api("/api/services");
  renderOptions(els.search.service, state.allServices, "Выберите услугу");
}

async function loadSpecializations() {
  const policlinicId = els.booking.policlinic.value;
  state.specializations = policlinicId
    ? await api(`/api/specializations?policlinicId=${policlinicId}`)
    : [];
  renderOptions(els.booking.specialization, state.specializations, "Выберите специализацию");
  renderOptions(els.booking.doctor, [], "Сначала выберите врача");
  renderOptions(els.booking.service, [], "Сначала выберите услугу");
  renderOptions(els.booking.availability, [], "Сначала выберите дату");
  state.selectedDoctor = null;
  state.selectedService = null;
  renderSummary();
}

async function loadDoctors() {
  const policlinicId = els.booking.policlinic.value;
  const specializationId = els.booking.specialization.value;
  if (!policlinicId || !specializationId) {
    renderOptions(els.booking.doctor, [], "Сначала выберите поликлинику и специализацию");
    return;
  }

  state.doctors = await api(`/api/doctors?policlinicId=${policlinicId}&specializationId=${specializationId}`);
  renderOptions(els.booking.doctor, state.doctors, "Выберите врача");
  renderOptions(els.booking.service, [], "Сначала выберите услугу");
  renderOptions(els.booking.availability, [], "Сначала выберите дату");
  state.selectedDoctor = null;
  state.selectedService = null;
  renderSummary();
}

async function loadServices() {
  const doctorId = els.booking.doctor.value;
  if (!doctorId) return;

  state.services = await api(`/api/services?doctorId=${doctorId}`);
  state.selectedDoctor = state.doctors.find(item => String(item.id) === String(doctorId)) || null;
  renderOptions(els.booking.service, state.services, "Выберите услугу");
  renderOptions(els.booking.availability, [], "Сначала выберите дату");
  state.selectedService = null;
  renderSummary();
}

async function loadAvailability() {
  const doctorId = els.booking.doctor.value;
  if (!doctorId) return;

  state.availability = await api(`/api/availability?doctorId=${doctorId}`);
  renderOptions(els.booking.availability, state.availability, "Выберите дату", "value", "label");
  state.selectedService = state.services.find(item => String(item.id) === String(els.booking.service.value)) || null;
  renderSummary();
}

async function loadAppointments() {
  state.appointments = await api("/api/appointments");
  renderAppointmentsList();
  if (state.selectedAppointment) {
    const fresh = state.appointments.find(item => item.id === state.selectedAppointment.id);
    state.selectedAppointment = fresh || null;
  }
  renderMedicalRecordPanel();
}

async function submitBooking() {
  clearFieldErrors();
  const patient_name = getSelectedPatientName(els.booking.patient);
  const doctor_service_id = Number(els.booking.service.value);
  const doctor_id = Number(els.booking.doctor.value);
  const appointment_date = els.booking.availability.value;

  if (!els.booking.patient.value) return failValidation("Выберите пациента.", els.booking.patient);
  const fullNameError = validateFullName(patient_name, els.booking.patientNoMiddleName.checked, "ФИО пациента");
  if (fullNameError) return failValidation(fullNameError, els.booking.patient);
  if (!els.booking.policlinic.value) return failValidation("Выберите поликлинику.", els.booking.policlinic);
  if (!els.booking.specialization.value) return failValidation("Выберите специализацию.", els.booking.specialization);
  if (!doctor_id) return failValidation("Выберите врача.", els.booking.doctor);
  if (!doctor_service_id) return failValidation("Выберите услугу.", els.booking.service);
  if (!appointment_date) return failValidation("Выберите дату и время приема.", els.booking.availability);

  await api("/api/appointments", {
    method: "POST",
    body: JSON.stringify({ patient_name, doctor_service_id, doctor_id, appointment_date }),
  });

  showToast("Запись успешно создана.");
  await Promise.all([loadDashboard(), loadAvailability(), loadAppointments()]);
  els.booking.availability.value = "";
  renderSummary();
}

async function searchAppointments() {
  clearFieldErrors();
  const patientName = getSelectedPatientName(els.search.patient);
  const serviceName = els.search.service.value.trim();

  if (!els.search.patient.value) return failValidation("Выберите пациента для поиска.", els.search.patient);
  const fullNameError = validateFullName(patientName, els.search.noMiddleName.checked, "ФИО пациента");
  if (fullNameError) return failValidation(fullNameError, els.search.patient);
  if (!serviceName) return failValidation("Выберите услугу для поиска записи.", els.search.service);

  const rows = await api(`/api/appointments/search?patientName=${encodeURIComponent(patientName)}&serviceName=${encodeURIComponent(serviceName)}`);
  if (!rows.length) {
    els.search.results.innerHTML = "<p>Совпадений не найдено.</p>";
    return;
  }

  els.search.results.innerHTML = rows.map(item => `
    <article class="result-card">
      <h3>${item.patient_name}</h3>
      <p><strong>Поликлиника:</strong> ${item.policlinic_name}</p>
      <p><strong>Врач:</strong> ${item.doctor_name}</p>
      <p><strong>Услуга:</strong> ${item.service_name}</p>
      <p><strong>Дата:</strong> ${item.appointment_date}</p>
      <p><strong>Статус:</strong> ${statusMap[item.status] || item.status}</p>
    </article>
  `).join("");
}

async function savePatient() {
  clearFieldErrors();
  const payload = {
    patient_name: els.patients.name.value.trim(),
    age: els.patients.age.value,
    address: els.patients.address.value.trim(),
    patient_phone: els.patients.phone.value.trim(),
    date_of_birth: els.patients.birthday.value,
  };

  const fullNameError = validateFullName(payload.patient_name, els.patients.noMiddleName.checked, "ФИО");
  if (fullNameError) return failValidation(fullNameError, els.patients.name);
  const ageError = validateAge(payload.age);
  if (ageError) return failValidation(ageError, els.patients.age);
  const addressError = validateRequired(payload.address, "Адрес");
  if (addressError) return failValidation(addressError, els.patients.address);
  const phoneError = validatePhone(payload.patient_phone, "Телефон");
  if (phoneError) return failValidation(phoneError, els.patients.phone);
  const birthdayError = validateDateNotFuture(payload.date_of_birth, "Дата рождения");
  if (birthdayError) return failValidation(birthdayError, els.patients.birthday);

  await api("/api/patients", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  showToast("Пациент сохранен в системе.");
  els.patients.name.value = "";
  els.patients.age.value = "";
  els.patients.address.value = "";
  els.patients.phone.value = "";
  els.patients.birthday.value = "";
  els.patients.noMiddleName.checked = false;
  await Promise.all([loadDashboard(), loadPatients()]);
}

async function saveDoctor() {
  clearFieldErrors();
  const payload = {
    policlinic_name: els.admin.policlinic.value.trim(),
    address: els.admin.address.value.trim(),
    phone: els.admin.phone.value.trim(),
    doctor_name: els.admin.doctor.value.trim(),
    room_number: els.admin.room.value.trim(),
    specialization_name: els.admin.specialization.value.trim(),
    experience: els.admin.experience.value.trim(),
    service_name: els.admin.service.value.trim(),
    service_price: els.admin.price.value,
    available_date: els.admin.availability.value,
  };

  const policlinicError = validateRequired(payload.policlinic_name, "Поликлиника");
  if (policlinicError) return failValidation(policlinicError, els.admin.policlinic);
  const addressError = validateRequired(payload.address, "Адрес");
  if (addressError) return failValidation(addressError, els.admin.address);
  const phoneError = validatePhone(payload.phone, "Телефон");
  if (phoneError) return failValidation(phoneError, els.admin.phone);
  const doctorError = validateFullName(payload.doctor_name, els.admin.doctorNoMiddleName.checked, "ФИО врача");
  if (doctorError) return failValidation(doctorError, els.admin.doctor);
  const roomError = validateRequired(payload.room_number, "Кабинет");
  if (roomError) return failValidation(roomError, els.admin.room);
  const specializationError = validateRequired(payload.specialization_name, "Специализация");
  if (specializationError) return failValidation(specializationError, els.admin.specialization);
  const experienceError = validateRequired(payload.experience, "Опыт работы");
  if (experienceError) return failValidation(experienceError, els.admin.experience);
  const serviceError = validateRequired(payload.service_name, "Услуга");
  if (serviceError) return failValidation(serviceError, els.admin.service);
  const priceError = validatePrice(payload.service_price);
  if (priceError) return failValidation(priceError, els.admin.price);
  const availabilityError = validateFutureDateTime(payload.available_date, "Дата доступности");
  if (availabilityError) return failValidation(availabilityError, els.admin.availability);

  await api("/api/admin/doctor", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  showToast("Врач, услуга и слот успешно сохранены.");
  await Promise.all([loadDashboard(), loadPoliclinics(), loadAppointments()]);
}

async function saveMedicalRecord() {
  clearFieldErrors();
  if (!state.selectedAppointment) {
    return failValidation("Сначала выберите запись пациента из списка.");
  }

  const diagnosis = els.appointments.diagnosis.value.trim();
  const treatment = els.appointments.treatment.value.trim();
  const notes = els.appointments.notes.value.trim();

  const diagnosisError = validateRequired(diagnosis, "Диагноз");
  if (diagnosisError) return failValidation(diagnosisError, els.appointments.diagnosis);
  const treatmentError = validateRequired(treatment, "Лечение");
  if (treatmentError) return failValidation(treatmentError, els.appointments.treatment);

  await api("/api/medical-records", {
    method: "POST",
    body: JSON.stringify({
      appointment_id: state.selectedAppointment.id,
      diagnosis,
      treatment,
      notes,
    }),
  });

  showToast("Медицинская запись сохранена.");
  await loadAppointments();
}

function initTabs() {
  els.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      els.tabs.forEach(item => item.classList.remove("active"));
      els.panels.forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

function bindValidationReset() {
  validatedFields.forEach(field => {
    if (!field) return;
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, () => field.classList.remove("field-invalid"));
  });
}

function bindEvents() {
  els.booking.patient.addEventListener("change", renderSummary);
  els.booking.policlinic.addEventListener("change", loadSpecializations);
  els.booking.specialization.addEventListener("change", loadDoctors);
  els.booking.doctor.addEventListener("change", loadServices);
  els.booking.service.addEventListener("change", loadAvailability);
  els.booking.availability.addEventListener("change", renderSummary);
  els.booking.patientNoMiddleName.addEventListener("change", renderSummary);
  els.booking.button.addEventListener("click", () => submitBooking().catch(error => showToast(error.message, true)));
  els.search.button.addEventListener("click", () => searchAppointments().catch(error => showToast(error.message, true)));
  els.patients.button.addEventListener("click", () => savePatient().catch(error => showToast(error.message, true)));
  els.admin.button.addEventListener("click", () => saveDoctor().catch(error => showToast(error.message, true)));
  els.appointments.button.addEventListener("click", () => saveMedicalRecord().catch(error => showToast(error.message, true)));
  bindValidationReset();
}

async function bootstrap() {
  initTabs();
  bindEvents();
  await Promise.all([
    loadDashboard(),
    loadPatients(),
    loadPoliclinics(),
    loadAllServices(),
    loadAppointments(),
  ]);
  renderSummary();
}

bootstrap().catch(error => showToast(error.message, true));
