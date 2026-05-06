using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Npgsql;

namespace WpfApp1
{
    public partial class Window1 : Window
    {
        private List<Policlinic> policlinics;
        private List<Doctor> doctors;
        private List<string> data = new List<string>();
        private string connectionString = "Host=localhost;Port=5432;Username=postgres;Password=123456789;Database=hosdb";

        public Window1()
        {
            InitializeComponent();
            LoadData();
            UpdateComboBoxes();
        }

        private void patientFullName_TextChanged(object sender, TextChangedEventArgs e)
        {
            // Ничего не делаем при изменении текста
        }

        private void policlinic_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            int selectedIndex = policlinicComboBox.SelectedIndex;
            doctorComboBox.Items.Clear();

            if (selectedIndex >= 0 && selectedIndex < policlinics.Count)
            {
                var selectedPoliclinic = policlinics[selectedIndex];
                foreach (var doctor in selectedPoliclinic.Doctors)
                {
                    doctorComboBox.Items.Add(doctor.Name);
                }
            }
            else
            {
                MessageBox.Show("Не удалось определить выбранную поликлинику.");
            }
        }

        private void doctor_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            serviceComboBox.Items.Clear();
            timeComboBox.Items.Clear();
            LoadServicesAndDates();
        }

        private void specialization_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            doctorComboBox.Items.Clear();
            serviceComboBox.Items.Clear();
            timeComboBox.Items.Clear();

            string selectedSpecialization = specializationComboBox.SelectedItem as string;

            if (!string.IsNullOrEmpty(selectedSpecialization))
            {
                var selectedDoctors = doctors.FindAll(d => d.Specialization == selectedSpecialization && d.PoliclinicName == (string)policlinicComboBox.SelectedValue);

                if (selectedDoctors.Count > 0)
                {
                    foreach (var doctor in selectedDoctors)
                    {
                        doctorComboBox.Items.Add(doctor.Name);
                    }
                }
                else
                {
                    MessageBox.Show("Для выбранной поликлиники не найдено врачей с этой специализацией.");
                    specializationComboBox.SelectedIndex = -1;
                }
            }
            else
            {
                MessageBox.Show("Сначала выберите специализацию.");
            }
        }

        private void PaymentButton(object sender, RoutedEventArgs e)
        {
            data.Clear();
            string[] str = PatientFullName.Text.Split(' ');
            str = str.Where(val => val != "").ToArray();
            if (str.Length == 3 || (str.Length == 2 && MiddleName.IsChecked == true))
            {
                if (policlinicComboBox.SelectedItem != null && doctorComboBox.SelectedItem != null
                    && serviceComboBox.SelectedItem != null && timeComboBox.SelectedItem != null)
                {
                    DownloadData(PatientFullName.Text);
                    Window2_PaymentInformation pay = new Window2_PaymentInformation(data);
                    pay.Show();
                    this.Close();
                }
                else
                {
                    MessageBox.Show("Для продолжения выберите поликлинику, врача, услугу и дату приема.");
                }
            }
            else
            {
                MessageBox.Show("Проверьте формат ФИО пациента. Ожидается две или три части имени.");
            }
        }

        private void DownloadData(string fio)
        {
            data.Add(fio);
            data.Add(policlinicComboBox.SelectedValue as string);
            data.Add(doctorComboBox.SelectedValue as string);
            data.Add(serviceComboBox.SelectedValue as string);
            data.Add(timeComboBox.SelectedValue as string);
        }

        private void LoadData()
        {
            try
            {
                using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                {
                    connection.Open();

                    policlinics = new List<Policlinic>();
                    doctors = new List<Doctor>();

                    string selectPoliclinicsQuery = "SELECT policlinic_id, policlinic_name FROM policlinic ORDER BY policlinic_name";
                    using (NpgsqlCommand command = new NpgsqlCommand(selectPoliclinicsQuery, connection))
                    {
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                Policlinic policlinic = new Policlinic();
                                policlinic.Id = reader.GetInt32(0);
                                policlinic.Name = reader.GetString(1);
                                policlinics.Add(policlinic);
                            }
                        }
                    }

                    string selectDoctorsQuery = @"
                        SELECT d.doctor_id,
                               d.doctor_name,
                               d.room_number,
                               s.specialization_name,
                               d.experience,
                               d.address,
                               d.doctor_phone,
                               p.policlinic_id,
                               p.policlinic_name
                        FROM doctor d
                        JOIN specialization s ON s.specialization_id = d.specialization_id
                        JOIN policlinic p ON p.policlinic_id = d.policlinic_id";
                    using (NpgsqlCommand command = new NpgsqlCommand(selectDoctorsQuery, connection))
                    {
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                Doctor doctor = new Doctor();
                                doctor.Id = reader.GetInt32(0);
                                doctor.Name = reader.GetString(1);
                                doctor.RoomNumber = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                                doctor.Specialization = reader.GetString(3);
                                doctor.Experience = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                                doctor.Address = reader.IsDBNull(5) ? string.Empty : reader.GetString(5);
                                doctor.Phone = reader.IsDBNull(6) ? string.Empty : reader.GetString(6);
                                doctor.PoliclinicId = reader.GetInt32(7);
                                doctor.PoliclinicName = reader.GetString(8);

                                doctors.Add(doctor);
                            }
                        }
                    }

                    foreach (var policlinic in policlinics)
                    {
                        policlinic.Doctors = doctors.FindAll(d => d.PoliclinicName == policlinic.Name);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Не удалось загрузить справочники системы: " + ex.Message);
            }
        }

        private void UpdateComboBoxes()
        {
            policlinicComboBox.Items.Clear();
            specializationComboBox.Items.Clear(); // Очищаем список специализаций

            foreach (var policlinic in policlinics)
            {
                policlinicComboBox.Items.Add(policlinic.Name);
            }

            // Загрузка списка специализаций
            foreach (var doctor in doctors)
            {
                if (!specializationComboBox.Items.Contains(doctor.Specialization)) // Проверяем, есть ли специализация в списке
                {
                    specializationComboBox.Items.Add(doctor.Specialization); // Добавляем специализацию в ComboBox специализаций
                }
            }
        }

        private void LoadServicesAndDates()
        {
            string selectedDoctor = doctorComboBox.SelectedValue as string;
            string selectedPoliclinic = policlinicComboBox.SelectedValue as string;

            if (selectedDoctor != null && selectedPoliclinic != null)
            {
                try
                {
                    using (NpgsqlConnection connection = new NpgsqlConnection(connectionString))
                    {
                        connection.Open();

                        string selectServicesQuery = @"
                            SELECT DISTINCT s.service_name
                            FROM doctor_service ds
                            JOIN service s ON s.service_id = ds.service_id
                            JOIN doctor d ON d.doctor_id = ds.doctor_id
                            JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                            WHERE d.doctor_name = @doctorName AND p.policlinic_name = @policlinicName";
                        using (NpgsqlCommand command = new NpgsqlCommand(selectServicesQuery, connection))
                        {
                            command.Parameters.AddWithValue("doctorName", selectedDoctor);
                            command.Parameters.AddWithValue("policlinicName", selectedPoliclinic);
                            using (NpgsqlDataReader reader = command.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    serviceComboBox.Items.Add(reader.GetString(0));
                                }
                            }
                        }

                        string selectDatesQuery = @"
                            SELECT DISTINCT da.available_date
                            FROM doctor_availability da
                            JOIN doctor d ON d.doctor_id = da.doctor_id
                            JOIN policlinic p ON p.policlinic_id = d.policlinic_id
                            WHERE d.doctor_name = @doctorName AND p.policlinic_name = @policlinicName";
                        using (NpgsqlCommand command = new NpgsqlCommand(selectDatesQuery, connection))
                        {
                            command.Parameters.AddWithValue("doctorName", selectedDoctor);
                            command.Parameters.AddWithValue("policlinicName", selectedPoliclinic);
                            using (NpgsqlDataReader reader = command.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    string dateString = reader.GetDateTime(0).ToString("dd-MM-yyyy");
                                    timeComboBox.Items.Add(dateString);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Не удалось загрузить услуги и доступные даты: " + ex.Message);
                }
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
