using Npgsql;
using System;
using System.Data;
using System.Windows;
using System.Windows.Controls;

namespace WpfApp1
{
    public class DataLoader
    {
        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        public void LoadDataByPatientName(string patientLastName, TextBox[] textBoxes)
        {
            try
            {
                using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                {
                    connection.Open();
                    string query = @"
                        SELECT pt.patient_name,
                               p.policlinic_name,
                               d.doctor_name,
                               s.service_name,
                               a.appointment_date
                        FROM appointment a
                        JOIN patient pt ON a.patient_id = pt.patient_id
                        JOIN doctor_service ds ON a.doctor_service_id = ds.doctor_service_id
                        JOIN doctor d ON ds.doctor_id = d.doctor_id
                        JOIN policlinic p ON d.policlinic_id = p.policlinic_id
                        JOIN service s ON ds.service_id = s.service_id
                        WHERE pt.patient_name = @patientLastName";
                    using (NpgsqlCommand command = new NpgsqlCommand(query, connection))
                    {
                        command.Parameters.AddWithValue("patientLastName", patientLastName);
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                textBoxes[0].Text = reader.GetString(0); // Заполнение ФИО пациента
                                textBoxes[1].Text = reader.GetString(1); // Заполнение названия поликлиники
                                textBoxes[2].Text = reader.GetString(2); // Заполнение имени врача
                                textBoxes[3].Text = reader.GetString(3); // Заполнение названия услуги
                                textBoxes[4].Text = reader.GetDateTime(4).ToString(); // Заполнение даты записи
                            }
                            else
                            {
                                MessageBox.Show("Информация о пациенте не найдена.");
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Произошла ошибка при загрузке информации о пациенте: " + ex.Message);
            }
        }
    }
}
