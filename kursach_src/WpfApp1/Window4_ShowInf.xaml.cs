using System;
using System.Collections.Generic;
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
    public partial class Window4_ShowInf : Window
    {
        public Window4_ShowInf(string fullName, string clinic, string doctor, string service, DateTime date)
        {
            InitializeComponent();
            FillTextBoxes(fullName, clinic, doctor, service, date);
        }

        public void FillTextBoxes(string fullName, string clinic, string doctor, string service, DateTime date)
        {
            PatientFullName_Inf.Text = fullName;
            Policlinic_Inf.Text = clinic;
            Doctor_Inf.Text = doctor;
            Service_Inf.Text = service;
            // Форматируем дату в нужный формат (только дата, без времени)
            DateTime_Inf.Text = date.ToString("dd.MM.yyyy");
        }


        private void BackToMain_Click(object sender, RoutedEventArgs e)
        {
            MainWindow mainWindow = new MainWindow();
            mainWindow.Show();
            this.Close();
        }
    }
}