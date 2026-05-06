using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace WpfApp1
{
    internal class Policlinic
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<Doctor> Doctors { get; set; }
    }

}
