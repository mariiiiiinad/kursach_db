using Npgsql;
using System;
using System.Collections.Generic;
using System.Windows;

namespace WpfApp1
{
    public static class AddInf
    {
        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        public static void AddDoctorInformation(string doctorName, string roomNumber, string specialization, string experience, string address, string doctorPhone, string policlinicName, List<(string serviceName, decimal servicePrice)> services)
        {
            using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
            {
                try
                {
                    connection.Open();

                    int policlinicId = EnsurePoliclinic(connection, policlinicName, address, doctorPhone);
                    int specializationId = EnsureSpecialization(connection, specialization);
                    int doctorId;
                    string checkDoctorQuery = "SELECT doctor_id FROM doctor WHERE doctor_name = @doctorName AND policlinic_id = @policlinicId";
                    using (NpgsqlCommand command = new NpgsqlCommand(checkDoctorQuery, connection))
                    {
                        command.Parameters.AddWithValue("doctorName", doctorName);
                        command.Parameters.AddWithValue("policlinicId", policlinicId);
                        var result = command.ExecuteScalar();
                        if (result != null)
                        {
                            doctorId = (int)result;
                        }
                        else
                        {
                            string insertDoctorQuery = "INSERT INTO doctor (doctor_name, room_number, specialization_id, experience, " +
                                "address, doctor_phone, policlinic_id) " +
                                "VALUES (@doctorName, @roomNumber, @specializationId, @experience, @address, " +
                                "@doctorPhone, @policlinicId) RETURNING doctor_id";
                            command.CommandText = insertDoctorQuery;
                            command.Parameters.AddWithValue("roomNumber", roomNumber);
                            command.Parameters.AddWithValue("specializationId", specializationId);
                            command.Parameters.AddWithValue("experience", experience);
                            command.Parameters.AddWithValue("address", address);
                            command.Parameters.AddWithValue("doctorPhone", doctorPhone);
                            doctorId = (int)command.ExecuteScalar();
                        }
                    }

                    foreach (var service in services)
                    {
                        int serviceId = EnsureService(connection, service.serviceName);
                        string insertServiceQuery = @"
                            INSERT INTO doctor_service (doctor_id, service_id, service_price)
                            VALUES (@doctorId, @serviceId, @servicePrice)
                            ON CONFLICT (doctor_id, service_id)
                            DO UPDATE SET service_price = EXCLUDED.service_price";
                        using (NpgsqlCommand serviceCommand = new NpgsqlCommand(insertServiceQuery, connection))
                        {
                            serviceCommand.Parameters.AddWithValue("doctorId", doctorId);
                            serviceCommand.Parameters.AddWithValue("serviceId", serviceId);
                            serviceCommand.Parameters.AddWithValue("servicePrice", service.servicePrice);
                            serviceCommand.ExecuteNonQuery();
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось сохранить сведения о враче и услугах: " + ex.Message);
                }
            }
        }

        public static void AddPatientRecord(string patientName, string policlinicName, string doctorName, string serviceName, DateTime appointmentDate)
        {
            using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
            {
                try
                {
                    connection.Open();

                    // Получение ID пациента по имени
                    int patientId;
                    string getPatientIdQuery = "SELECT patient_id FROM patient WHERE patient_name = @patientName";
                    using (NpgsqlCommand command = new NpgsqlCommand(getPatientIdQuery, connection))
                    {
                        command.Parameters.AddWithValue("patientName", patientName);
                        patientId = (int)command.ExecuteScalar();
                    }

                    // Получение ID врача по имени и поликлинике
                    int doctorServiceId;
                    string getDoctorServiceIdQuery = @"
                        SELECT ds.doctor_service_id
                        FROM doctor_service ds
                        JOIN doctor d ON d.doctor_id = ds.doctor_id
                        JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                        JOIN service s ON s.service_id = ds.service_id
                        WHERE d.doctor_name = @doctorName
                          AND p.policlinic_name = @policlinicName
                          AND s.service_name = @serviceName";
                    using (NpgsqlCommand command = new NpgsqlCommand(getDoctorServiceIdQuery, connection))
                    {
                        command.Parameters.AddWithValue("doctorName", doctorName);
                        command.Parameters.AddWithValue("policlinicName", policlinicName);
                        command.Parameters.AddWithValue("serviceName", serviceName);
                        doctorServiceId = (int)command.ExecuteScalar();
                    }

                    // Вставка записи о приеме в таблицу Appointment
                    string insertAppointmentQuery = "INSERT INTO appointment (patient_id, doctor_service_id, appointment_date) VALUES (@patientId, @doctorServiceId, @appointmentDate)";
                    using (NpgsqlCommand command = new NpgsqlCommand(insertAppointmentQuery, connection))
                    {
                        command.Parameters.AddWithValue("patientId", patientId);
                        command.Parameters.AddWithValue("doctorServiceId", doctorServiceId);
                        command.Parameters.AddWithValue("appointmentDate", appointmentDate);
                        command.ExecuteNonQuery();
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось создать запись пациента на прием: " + ex.Message);
                }
            }
        }

        public static void AddDoctorAvailability(int doctorId, DateTime availableDate)
        {
            using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
            {
                try
                {
                    connection.Open();

                    // Проверка существования врача с указанным идентификатором
                    string checkDoctorQuery = "SELECT COUNT(*) FROM doctor WHERE doctor_id = @doctorId";
                    using (NpgsqlCommand checkCommand = new NpgsqlCommand(checkDoctorQuery, connection))
                    {
                        checkCommand.Parameters.AddWithValue("doctorId", doctorId);
                        int doctorCount = Convert.ToInt32(checkCommand.ExecuteScalar()); // Явное преобразование результата к int
                        if (doctorCount == 0)
                        {
                            MessageBox.Show("Для сохранения слота врач не найден.");
                            return;
                        }
                    }

                    string insertAvailabilityQuery = @"
                        INSERT INTO doctor_availability (doctor_id, available_date)
                        VALUES (@doctorId, @availableDate)
                        ON CONFLICT (doctor_id, available_date) DO NOTHING";
                    using (NpgsqlCommand command = new NpgsqlCommand(insertAvailabilityQuery, connection))
                    {
                        command.Parameters.AddWithValue("doctorId", doctorId);
                        command.Parameters.AddWithValue("availableDate", availableDate);
                        command.ExecuteNonQuery();
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось сохранить доступную дату врача: " + ex.Message);
                }
            }
        }

        private static int EnsurePoliclinic(NpgsqlConnection connection, string policlinicName, string address, string phone)
        {
            string query = @"
                INSERT INTO policlinic (policlinic_name, address, phone)
                VALUES (@name, @address, @phone)
                ON CONFLICT (policlinic_name)
                DO UPDATE SET
                    address = EXCLUDED.address,
                    phone = EXCLUDED.phone
                RETURNING policlinic_id";

            using (NpgsqlCommand command = new NpgsqlCommand(query, connection))
            {
                command.Parameters.AddWithValue("name", policlinicName);
                command.Parameters.AddWithValue("address", (object)address ?? DBNull.Value);
                command.Parameters.AddWithValue("phone", (object)phone ?? DBNull.Value);
                return (int)command.ExecuteScalar();
            }
        }

        private static int EnsureSpecialization(NpgsqlConnection connection, string specializationName)
        {
            string query = @"
                INSERT INTO specialization (specialization_name)
                VALUES (@name)
                ON CONFLICT (specialization_name)
                DO UPDATE SET specialization_name = EXCLUDED.specialization_name
                RETURNING specialization_id";

            using (NpgsqlCommand command = new NpgsqlCommand(query, connection))
            {
                command.Parameters.AddWithValue("name", specializationName);
                return (int)command.ExecuteScalar();
            }
        }

        private static int EnsureService(NpgsqlConnection connection, string serviceName)
        {
            string query = @"
                INSERT INTO service (service_name)
                VALUES (@name)
                ON CONFLICT (service_name)
                DO UPDATE SET service_name = EXCLUDED.service_name
                RETURNING service_id";

            using (NpgsqlCommand command = new NpgsqlCommand(query, connection))
            {
                command.Parameters.AddWithValue("name", serviceName);
                return (int)command.ExecuteScalar();
            }
        }
    }
}
