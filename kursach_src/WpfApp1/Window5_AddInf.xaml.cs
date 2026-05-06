using Newtonsoft.Json;
using Npgsql;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace WpfApp1
{
    /// <summary>
    /// Логика взаимодействия для Window5_AddInf.xaml
    /// </summary>
    public partial class Window5_AddInf : Window
    {

        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";
        public Window5_AddInf()
        {
            InitializeComponent();
        }

        private void BackToMain_Click(object sender, RoutedEventArgs e)
        {
            string policlinicName = Policlinic_Inf.Text;
            string doctorName = Doctor_Inf.Text;
            string specialization = Specialization_inf.Text;
            string roomNumber = Room_Inf.Text;
            string experience = Experience_Inf.Text;
            string doctorService = Service_Inf.Text;
            string address = Adress_Inf.Text;
            string doctorPhone = Number_phone.Text;
            DateTime doctorAvailableDay;
            decimal servicePrice;

            if (string.IsNullOrWhiteSpace(policlinicName) ||
                string.IsNullOrWhiteSpace(doctorName) ||
                string.IsNullOrWhiteSpace(specialization) ||
                string.IsNullOrWhiteSpace(roomNumber) ||
                string.IsNullOrWhiteSpace(doctorService))
            {
                MessageBox.Show("Заполните обязательные поля: поликлиника, врач, кабинет, специализация и услуга.");
                return;
            }

            if (DateTime.TryParse(DateTime_Inf.Text, out doctorAvailableDay) && decimal.TryParse(Price_Inf.Text, out servicePrice))
            {
                List<(string serviceName, decimal servicePrice)> services = new List<(string, decimal)>();
                services.Add((doctorService, servicePrice));
                AddInf.AddDoctorInformation(doctorName, roomNumber, specialization, experience, address, doctorPhone, policlinicName, services);

                // Получаем идентификатор врача из базы данных
                int doctorId = GetDoctorIdFromDatabase(doctorName, policlinicName);
                AddInf.AddDoctorAvailability(doctorId, doctorAvailableDay); // добавляем информацию о доступности врача
                MainWindow mainWindow = new MainWindow();
                mainWindow.Show();
                this.Close();
            }
            else
            {
                MessageBox.Show("Проверьте дату доступности и стоимость услуги.");
            }
        }

        private void Home_Button_Click(object sender, RoutedEventArgs e)
        {
            MainWindow myWindow = new MainWindow();
            this.Close();
            myWindow.Show();
        }

        // Метод для получения идентификатора врача из базы данных
        private int GetDoctorIdFromDatabase(string doctorName, string policlinicName)
        {
            int doctorId = 0; // Инициализируем переменную для хранения идентификатора врача
            using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
            {
                try
                {
                    connection.Open();
                    string getDoctorIdQuery = @"
                        SELECT d.doctor_id
                        FROM doctor d
                        JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                        WHERE d.doctor_name = @doctorName AND p.policlinic_name = @policlinicName";
                    using (NpgsqlCommand command = new NpgsqlCommand(getDoctorIdQuery, connection))
                    {
                        command.Parameters.AddWithValue("doctorName", doctorName);
                        command.Parameters.AddWithValue("policlinicName", policlinicName);
                        var result = command.ExecuteScalar();
                        if (result != null)
                        {
                            doctorId = (int)result; // Преобразуем результат запроса в int и сохраняем в doctorId
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось определить идентификатор врача: " + ex.Message);
                }
            }
            return doctorId; // Возвращаем идентификатор врача
        }

    }
}


