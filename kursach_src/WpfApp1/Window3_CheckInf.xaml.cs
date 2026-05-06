using Npgsql;
using System;
using System.Windows;

namespace WpfApp1
{
    public partial class Window3_CheckInf : Window
    {
        public Window3_CheckInf()
        {
            InitializeComponent();
        }

        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        private void CheckInf_Button_Click(object sender, RoutedEventArgs e)
        {
            string patientLastName = FullName_CheckInf.Text;
            string selectedService = Service_CheckInf.Text;

            if (string.IsNullOrWhiteSpace(patientLastName) || string.IsNullOrWhiteSpace(selectedService))
            {
                MessageBox.Show("Введите ФИО пациента и услугу для поиска.");
                return;
            }

            try
            {
                using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                {
                    connection.Open();

                    // Поиск записи в базе данных
                    string getAppointmentQuery = @"
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
                        WHERE pt.patient_name = @patientName AND s.service_name = @serviceName";

                    using (NpgsqlCommand command = new NpgsqlCommand(getAppointmentQuery, connection))
                    {
                        command.Parameters.AddWithValue("patientName", patientLastName);
                        command.Parameters.AddWithValue("serviceName", selectedService);

                        NpgsqlDataReader reader = command.ExecuteReader();

                        if (reader.Read())
                        {
                            string patientName = reader.GetString(0);
                            string policlinicName = reader.GetString(1);
                            string doctorName = reader.GetString(2);
                            string serviceName = reader.GetString(3);
                            DateTime appointmentDate = reader.GetDateTime(4);

                            Window4_ShowInf window4 = new Window4_ShowInf(patientName, policlinicName, doctorName, serviceName, appointmentDate);
                            window4.Show();
                            this.Close();
                        }
                        else
                        {
                            MessageBox.Show("Запись с такими параметрами не найдена.");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Во время поиска записи возникла ошибка: " + ex.Message);
            }
        }

        private void Home_Button_Click(object sender, RoutedEventArgs e)
        {
            MainWindow myWindow = new MainWindow();
            this.Close();
            myWindow.Show(); 
        }
    }
}
