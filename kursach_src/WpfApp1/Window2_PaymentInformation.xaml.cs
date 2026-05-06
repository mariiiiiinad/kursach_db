using Npgsql;
using System;
using System.Collections.Generic;
using System.Windows;

namespace WpfApp1
{
    public partial class Window2_PaymentInformation : Window
    {
        private List<string> information;
        private int doctorId; // Переменная doctorId определена на уровне класса

        public Window2_PaymentInformation(List<string> data)
        {
            information = data;
            InitializeComponent();
            LoadData();
        }

        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        private void ToPay(object sender, RoutedEventArgs e)
        {
            string patientName = PatientFullName_PaymentInf.Text;
            string policlinicName = Policlinic_PaymentInf.Text;
            string doctorName = Doctor_PaymentInf.Text;
            string serviceName = Service_PaymentInf.Text;
            DateTime appointmentDate;

            if (DateTime.TryParse(DateTime_PaymentInf.Text, out appointmentDate))
            {
                try
                {
                    using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                    {
                        connection.Open();
                        string insertAppointmentQuery = "INSERT INTO appointment (patient_id, doctor_service_id, appointment_date) VALUES (@patientId, @doctorServiceId, @appointmentDate)";
                        using (NpgsqlCommand command = new NpgsqlCommand(insertAppointmentQuery, connection))
                        {
                            // Получение идентификатора связки врач-услуга по врачу, поликлинике и услуге
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
                            using (NpgsqlCommand doctorIdCommand = new NpgsqlCommand(getDoctorServiceIdQuery, connection))
                            {
                                doctorIdCommand.Parameters.AddWithValue("doctorName", doctorName);
                                doctorIdCommand.Parameters.AddWithValue("policlinicName", policlinicName);
                                doctorIdCommand.Parameters.AddWithValue("serviceName", serviceName);
                                doctorServiceId = (int)doctorIdCommand.ExecuteScalar();
                            }

                            string getDoctorIdQuery = @"
                                SELECT d.doctor_id
                                FROM doctor d
                                JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                                WHERE d.doctor_name = @doctorName AND p.policlinic_name = @policlinicName";
                            using (NpgsqlCommand doctorCommand = new NpgsqlCommand(getDoctorIdQuery, connection))
                            {
                                doctorCommand.Parameters.AddWithValue("doctorName", doctorName);
                                doctorCommand.Parameters.AddWithValue("policlinicName", policlinicName);
                                doctorId = (int)doctorCommand.ExecuteScalar();
                            }

                            // Получение идентификатора пациента по его имени
                            int patientId;
                            string getPatientIdQuery = "SELECT patient_id FROM patient WHERE patient_name = @patientName";
                            using (NpgsqlCommand patientIdCommand = new NpgsqlCommand(getPatientIdQuery, connection))
                            {
                                patientIdCommand.Parameters.AddWithValue("patientName", patientName);
                                patientId = (int)patientIdCommand.ExecuteScalar();
                            }

                            command.Parameters.AddWithValue("patientId", patientId);
                            command.Parameters.AddWithValue("doctorServiceId", doctorServiceId);
                            command.Parameters.AddWithValue("appointmentDate", appointmentDate);
                            command.ExecuteNonQuery();
                        }

                        // Удаление даты приёма из базы данных
                        string deleteAppointmentDateQuery = "DELETE FROM doctor_availability WHERE doctor_id = @doctorId AND available_date = @appointmentDate";
                        using (NpgsqlCommand deleteCommand = new NpgsqlCommand(deleteAppointmentDateQuery, connection))
                        {
                            deleteCommand.Parameters.AddWithValue("doctorId", doctorId);
                            deleteCommand.Parameters.AddWithValue("appointmentDate", appointmentDate);
                            deleteCommand.ExecuteNonQuery();
                        }
                    }
                    MessageBox.Show("Запись пациента успешно подтверждена.");
                    MainWindow mainWindow = new MainWindow();
                    mainWindow.Show();
                    this.Close();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось подтвердить запись пациента: " + ex.Message);
                }
            }
            else
            {
                MessageBox.Show("Дата приема указана в неверном формате.");
            }
        }

        private void LoadData()
        {
            PatientFullName_PaymentInf.Text = (string)information[0];
            Policlinic_PaymentInf.Text = (string)information[1];
            Doctor_PaymentInf.Text = (string)information[2];
            Service_PaymentInf.Text = (string)information[3];
            DateTime_PaymentInf.Text = (string)information[4];
            LoadPay();
        }

        private void LoadPay()
        {
            try
            {
                using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                {
                    connection.Open();
                    string getServicePriceQuery = @"
                        SELECT ds.service_price
                        FROM doctor_service ds
                        JOIN doctor d ON d.doctor_id = ds.doctor_id
                        JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                        JOIN service s ON s.service_id = ds.service_id
                        WHERE s.service_name = @serviceName
                          AND d.doctor_name = @doctorName
                          AND p.policlinic_name = @policlinicName";
                    using (NpgsqlCommand command = new NpgsqlCommand(getServicePriceQuery, connection))
                    {
                        command.Parameters.AddWithValue("serviceName", information[3]);
                        command.Parameters.AddWithValue("doctorName", information[2]);
                        command.Parameters.AddWithValue("policlinicName", information[1]);
                        var result = command.ExecuteScalar();
                        if (result != null && result != DBNull.Value) // Добавлено условие для проверки значения null
                        {
                            double servicePrice;
                            if (double.TryParse(result.ToString(), out servicePrice)) // Проверка успешного преобразования строки в число
                            {
                                FinalSum.Text = servicePrice.ToString();
                            }
                            else
                            {
                                MessageBox.Show("Цена услуги получена в неверном формате.");
                            }
                        }
                        else
                        {
                            MessageBox.Show("Для выбранной услуги цена не найдена.");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Не удалось загрузить стоимость приема: " + ex.Message);
            }
        }
    }
}
