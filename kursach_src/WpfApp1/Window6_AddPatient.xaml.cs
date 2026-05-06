using Npgsql;
using System;
using System.Globalization;
using System.Windows;

namespace WpfApp1
{
    public partial class Window6_AddPatient : Window
    {
        private static string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        public Window6_AddPatient()
        {
            InitializeComponent();
        }

        private void BackToMain_Click(object sender, RoutedEventArgs e)
        {
            string fio = Fio_Patient.Text;
            string age = Age_Patient.Text;
            string address = Adress_Patient.Text;
            string phoneNumber = Number_Patient.Text;
            string birthdayText = Bairthday_Patient.Text;

            if (string.IsNullOrWhiteSpace(fio) ||
                string.IsNullOrWhiteSpace(age) ||
                string.IsNullOrWhiteSpace(address) ||
                string.IsNullOrWhiteSpace(phoneNumber) ||
                string.IsNullOrWhiteSpace(birthdayText))
            {
                MessageBox.Show("Заполните все поля карточки пациента.");
                return;
            }

            if (!int.TryParse(age, out int ageValue))
            {
                MessageBox.Show("Возраст должен быть целым числом.");
                return;
            }

            if (DateTime.TryParse(birthdayText, out DateTime birthday))
            {
                try
                {
                    using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                    {
                        connection.Open();
                        string insertPatientQuery = "INSERT INTO patient (patient_name, age, address, patient_phone, date_of_birth) VALUES (@fio, @age, @address, @phoneNumber, @birthday)";
                        using (NpgsqlCommand command = new NpgsqlCommand(insertPatientQuery, connection))
                        {
                            command.Parameters.AddWithValue("fio", fio);
                            command.Parameters.AddWithValue("age", ageValue);
                            command.Parameters.AddWithValue("address", address);
                            command.Parameters.AddWithValue("phoneNumber", phoneNumber);
                            command.Parameters.AddWithValue("birthday", birthday.Date);
                            command.ExecuteNonQuery();
                        }
                    }
                    MessageBox.Show("Карточка пациента успешно сохранена.");
                    MainWindow mainWindow = new MainWindow();
                    mainWindow.Show();
                    this.Close();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось сохранить карточку пациента: " + ex.Message);
                }
            }
            else
            {
                MessageBox.Show("Дата рождения указана в неверном формате.");
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
