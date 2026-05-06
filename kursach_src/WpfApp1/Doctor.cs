using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace WpfApp1
{
    internal class Doctor
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string RoomNumber { get; set; }
        public string Specialization { get; set; }
        public string Experience { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public int PoliclinicId { get; set; }
        public string PoliclinicName { get; set; }
    }
}
